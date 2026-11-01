# VIBECHAIN - Trustworthy Club Treasury
## Technical Architecture & Implementation Plan

### 1. Overview & Problem Definition
**Problem:** Trustworthy Club Treasury. Shared funds in DAOs, clubs, and collectives are routinely vulnerable to rug pulls, insider misuse, opaque transactions, and unilateral admin actions.
**Solution:** `ClubTreasury` is an immutable, autonomous smart contract on Ethereum Sepolia.
- **Zero Admin:** No owner, no admin, no pause, no upgradeability, no proxy, no selfdestruct, no roles. The deployer has identical privileges to any other public user after deployment.
- **Rule-Bound Outflows:** Funds can **only** exit the contract via `execute()`, requiring an active proposal, majority consensus (`yes > no`), quorum threshold, and spend cap checks.
- **Complete Transparency:** Every inflow (`contribute()`, `join()`) and outflow (`execute()`) emits explicit indexed events verifiable on Etherscan and within the dApp's brutalist On-Chain Ledger.

---

### 2. Contract Specification (ClubTreasury.sol)
- **Compiler:** Solidity `^0.8.20`
- **Dependencies:** OpenZeppelin `ReentrancyGuard` only.

#### Immutable Constructor Parameters (Strictly Validated):
1. `MEMBERSHIP_FEE` (`uint256 > 0`): Fixed ETH cost to join. For demo: `0.001 ether`.
2. `VOTING_PERIOD` (`uint256 >= 60 seconds`): Duration for members to cast votes. For demo: `300 seconds` (5 minutes).
3. `EXECUTION_WINDOW` (`uint256 >= 3600 seconds`): Period after voting ends during which a passed proposal can be executed. For demo: `86400 seconds` (24 hours).
4. `QUORUM_BPS` (`uint256`, `1..10000`): Minimum percentage of members required to vote `yes` (basis points, 100 bps = 1%). For demo: `5000` (50%).
5. `MAX_SPEND_BPS` (`uint256`, `1..10000`): Maximum percentage of the treasury balance that any single proposal can request. For demo: `5000` (50%).

#### State Variables:
- `uint256 public memberCount;`
- `mapping(address => uint256) public joinedAt;` // 0 if not member, timestamp if member
- `uint256 public proposalCount;`
- `struct Proposal {`
    `address proposer;`
    `address payable recipient;`
    `uint256 amount;`
    `string purpose;`
    `uint256 createdAt;`
    `uint256 votingEnds;`
    `uint256 expiresAt;`
    `uint256 snapshotMembers;`
    `uint256 yesVotes;`
    `uint256 noVotes;`
    `bool executed;`
  `}`
- `mapping(uint256 => Proposal) public proposals;`
- `mapping(uint256 => mapping(address => bool)) public hasVoted;`

#### Proposal Status Enum:
```solidity
enum ProposalStatus {
    Active,    // block.timestamp <= votingEnds
    Passed,    // votingEnds < block.timestamp <= expiresAt, not executed, yesVotes > noVotes, yesVotes * 10000 >= snapshotMembers * QUORUM_BPS
    Rejected,  // votingEnds < block.timestamp, not executed, yesVotes <= noVotes OR quorum not met
    Expired,   // block.timestamp > expiresAt, not executed
    Executed   // executed == true
}
```

#### Core External Functions:
1. `receive() external payable`: Accepts ETH, requires `msg.value > 0`, emits `Contributed(msg.sender, msg.value)`.
2. `contribute() external payable`: Explicit function to donate ETH without joining. Requires `msg.value > 0`, emits `Contributed(msg.sender, msg.value)`.
3. `join() external payable`:
   - Reverts if `isMember(msg.sender)` (`joinedAt[msg.sender] > 0`).
   - Reverts if `msg.value < MEMBERSHIP_FEE`.
   - `joinedAt[msg.sender] = block.timestamp`.
   - `memberCount++`.
   - Emits `Joined(msg.sender, msg.value)`.
4. `leave() external`:
   - Reverts if `!isMember(msg.sender)`.
   - Sets `joinedAt[msg.sender] = 0`.
   - Decrements `memberCount--`.
   - No refund (funds remain locked in treasury).
   - Emits `Left(msg.sender)`.
5. `propose(address payable recipient, uint256 amount, string calldata purpose) external returns (uint256)`:
   - Reverts if `!isMember(msg.sender)`.
   - Reverts if `recipient == address(0)` or `recipient == address(this)`.
   - Reverts if `amount == 0`.
   - Reverts if `amount > (address(this).balance * MAX_SPEND_BPS) / 10000`.
   - Reverts if `bytes(purpose).length == 0` or `bytes(purpose).length > 200`.
   - Creates proposal with `snapshotMembers = memberCount`.
   - Emits `ProposalCreated(id, msg.sender, recipient, amount, purpose, createdAt, votingEnds, expiresAt, snapshotMembers)`.
6. `vote(uint256 id, bool support) external`:
   - Proposal must exist (`id > 0 && id <= proposalCount`).
   - Must be current member (`isMember(msg.sender)`).
   - Member must have joined **strictly before** proposal was created (`joinedAt[msg.sender] < proposal.createdAt`). Prevents flash-loan / last-second voting Sybil attacks.
   - Current time must be strictly before deadline (`block.timestamp <= proposal.votingEnds`).
   - Member must not have voted on this proposal already (`!hasVoted[id][msg.sender]`).
   - Records vote: `hasVoted[id][msg.sender] = true`.
   - Increments `yesVotes` or `noVotes`.
   - Emits `Voted(id, msg.sender, support)`.
7. `execute(uint256 id) external nonReentrant`:
   - Callable by anyone (permissionless).
   - Reverts if already executed (`proposal.executed`).
   - Reverts if voting has not ended (`block.timestamp <= proposal.votingEnds`).
   - Reverts if expired (`block.timestamp > proposal.expiresAt`).
   - Checks voting outcome: requires `yesVotes > noVotes` AND `yesVotes * 10000 >= snapshotMembers * QUORUM_BPS`.
   - Dynamic re-checks against current treasury balance:
     - `proposal.amount <= address(this).balance`
     - `proposal.amount <= (address(this).balance * MAX_SPEND_BPS) / 10000`
   - Sets `proposal.executed = true` **before** the external call (Checks-Effects-Interactions).
   - Transfers ETH using `.call{value: proposal.amount}("")`, requiring `success`.
   - Emits `Executed(id, proposal.recipient, proposal.amount, proposal.purpose)`.

#### Views:
- `treasuryBalance() external view returns (uint256)`
- `isMember(address account) external view returns (bool)`
- `getProposal(uint256 id) external view returns (...)`
- `status(uint256 id) external view returns (ProposalStatus)`

---

### 3. Events Interface
```solidity
event Contributed(address indexed from, uint256 amount);
event Joined(address indexed member, uint256 feePaid);
event Left(address indexed member);
event ProposalCreated(
    uint256 indexed id,
    address indexed proposer,
    address indexed recipient,
    uint256 amount,
    string purpose,
    uint256 createdAt,
    uint256 votingEnds,
    uint256 expiresAt,
    uint256 snapshotMembers
);
event Voted(uint256 indexed id, address indexed voter, bool support);
event Executed(uint256 indexed id, address indexed recipient, uint256 amount, string purpose);
```

---

### 4. Frontend & UI Architecture (Stitch Monolith System)
- **Stitch Project:** 7791138313881414611 ("Treasury Ethereum dApp Design")
- **Design System:** Brutalist Monolith (`#FF4D1C` Signal Orange, `#1B1BFF` Cobalt, `#141414` Ink, `#FCF9F8` Bone ground, Anton & Space Grotesk fonts, sharp 0px corners, 2px/4px architectural borders).
- **Three.js Monolith:** Interactive 3D wireframe vault rotating in the hero viewport.
- **Core Views / Tabs:**
  1. **Dashboard:** Treasury balance, member count, immutable parameters (Fee, Voting Window, Execution Window, Quorum %, Max Spend Cap %), Etherscan contract link, wireframe monolith.
  2. **Membership Actions:** Join payable with `MEMBERSHIP_FEE`, Leave club, member status indicator.
  3. **Proposals & Voting:** List of all proposals with dynamic badges (`ACTIVE`, `PASSED`, `REJECTED`, `EXPIRED`, `EXECUTED`), quorum & yes/no tally bars, cast vote (Yes/No), and permissionless Execute button.
  4. **Create Proposal:** Form with recipient address, ETH amount, purpose (1..200 chars), with instant client-side validation against current balance & `MAX_SPEND_BPS`.
  5. **Ledger / Transparency Feed:** Live on-chain event stream parsing `Contributed`, `Joined`, `Left`, `ProposalCreated`, `Voted`, `Executed` with Etherscan transaction links.

---

### 5. Security Risks & Mitigations
| Threat / Attack Vector | Mitigation in ClubTreasury |
|---|---|
| **Rug Pull / Unilateral Drain** | Zero admin/owner. Deployer has 0 privileges. Funds leave ONLY via `execute()`. |
| **Flash Join / Sybil Voting** | `joinedAt[voter] < proposal.createdAt` ensures members who join during/after proposal cannot vote. |
| **Reentrancy on Execute** | Checks-Effects-Interactions (`executed = true` before transfer) + OpenZeppelin `ReentrancyGuard`. |
| **Griefing / Balance Depletion** | Dynamic balance re-check during `execute()` guarantees contract never spends more than it currently holds or exceeds `MAX_SPEND_BPS`. |
| **Double Voting / Double Execution** | `hasVoted` mapping prevents double votes; `executed` boolean flag checked and flipped immediately. |
| **Unbounded Loops / DoS** | No unbounded loops anywhere in the contract. Direct mapping lookups. |
| **Input Validation** | Reverts on `address(0)`, `address(this)`, zero amounts, invalid constructor parameters, out-of-range strings. |

---

### 6. Known Tradeoffs (Disclosed in README)
1. **One-Wallet-One-Vote:** Sybil resistance is anchored to the economic cost of the `MEMBERSHIP_FEE`.
2. **Non-Refundable Leave:** Leaving the club does not refund the membership fee; forfeited funds remain in the treasury to protect collective liquidity.
3. **Execution Window & Balance Fluctuations:** If a proposal passes but treasury balance drops below required amount before execution, execution will revert until more funds arrive or until `expiresAt`, after which it becomes Expired.

