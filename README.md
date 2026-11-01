# VIBECHAIN: Trustworthy Club Treasury

> **An autonomous, immutable Ethereum collective treasury where code is law. No owner. No admin. Rules only.**

[![Ethereum Sepolia](https://img.shields.io/badge/Network-Sepolia%20Testnet-blue.svg)](https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636.svg)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Priyanshu-2308/VIBECHAIN/actions/workflows/deploy.yml/badge.svg)](https://github.com/Priyanshu-2308/VIBECHAIN/actions)

---

## 1. Live Deployment & Links
- **Live dApp URL:** [https://priyanshu-2308.github.io/VIBECHAIN/](https://priyanshu-2308.github.io/VIBECHAIN/)
- **Contract Address (Sepolia):** [`0xF48e84897C92387dc11b08058511BD3cc2B3B9c7`](https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7)
- **Deployment Block:** `12039018`
- **Sepolia Etherscan Explorer:** [https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7](https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7)

---

## 2. Problem Statement
Shared club funds in student organizations, sports clubs, developer collectives, and DAOs are traditionally susceptible to:
- **Centralized Custodianship:** One person holds the keys or wallet;
- **Silent Misuse / Admin Rug Pulls:** Deployers withdraw treasury assets or upgrade contracts with malicious logic;
- **Retroactive Voting Cartels:** Attackers join at the last second or use flash loans to swing voting outcomes;
- **Opaque Outflows:** Transactions lack public on-chain links connecting expenditures to an agreed purpose and vote.

**VIBECHAIN** solves this through a self-executing Ethereum smart contract where rules are baked into consensus bytecode.

---

## 3. Four Core Questions for Judges

### 1. Who can do what?
| Actor | Inflows (`receive` / `contribute`) | `join()` | `leave()` | `propose()` | `vote()` | `execute()` |
|---|---|---|---|---|---|---|
| **Public Observer** | Allowed (ETH donations) | Allowed (with fee) | Reverts | Reverts | Reverts | **Allowed** (Permissionless) |
| **Active Member** | Allowed | Reverts (Already member) | Allowed (No refund) | **Allowed** | **Allowed** (if joined before proposal) | **Allowed** (Permissionless) |
| **Deployer** | Same as public observer | Same as public observer | Reverts | Reverts | Reverts | Same as public observer |

### 2. How is a spending decision made?
1. **Requisition (`propose`):** Any active member creates a proposal with a designated recipient, requested ETH, and purpose (1..200 bytes). The amount is strictly capped at `50%` of the active balance.
2. **Snapshot Weight:** The proposal records `snapshotMembers = memberCount` at creation. Only members who joined **strictly before** `proposal.createdAt` can vote.
3. **Consensus Period:** Active voting lasts for `VOTING_PERIOD` (300 seconds for demo). Each eligible member gets exactly one vote (`yes` or `no`).
4. **Validation Bar:** For a proposal to pass, it must achieve both:
   - **Majority Consensus:** `yesVotes > noVotes`
   - **Quorum Threshold:** `yesVotes * 10000 >= snapshotMembers * QUORUM_BPS` (50%)
5. **Execution Window:** Once voting ends, anyone can call `execute(id)` during `EXECUTION_WINDOW` (24 hours).

### 3. Why can NO single person, including the deployer, quietly misuse funds?
- **Zero Privileges:** The contract contains no `owner`, no `admin`, no `onlyOwner` modifier, no multi-sig role, and no pauses.
- **Zero Backdoors:** No `selfdestruct`, no `delegatecall`, no proxies, no upgradeability, and no `tx.origin`.
- **Sole Outflow Gate:** Funds leave the contract **exclusively** through `execute()`.
- **Checks-Effects-Interactions & Reentrancy Guard:** State is updated (`executed = true`) before the external call, and functions are guarded with OpenZeppelin's `nonReentrant`.
- **Dynamic Solvency Re-Check:** If earlier proposals reduce the balance below the requested amount or the 50% cap, `execute()` reverts immediately.

### 4. What can anyone verify publicly afterwards?
Every lifecycle event emits indexed on-chain events:
- `Contributed(address indexed from, uint256 amount)`
- `Joined(address indexed member, uint256 feePaid)`
- `Left(address indexed member)`
- `ProposalCreated(...)`
- `Voted(uint256 indexed id, address indexed voter, bool support)`
- `Executed(uint256 indexed id, address indexed recipient, uint256 amount, string purpose)`

On the **Ledger** view in the dApp, every transaction links directly to the block and tx hash on Etherscan, creating an unforgeable public chronicle.

---

## 4. Demo Parameters & Rationale
| Parameter | Value | Rationale |
|---|---|---|
| `MEMBERSHIP_FEE` | `0.001 ETH` | Economic threshold ensuring one-wallet-one-vote Sybil resistance. |
| `VOTING_PERIOD` | `300 seconds` (5 mins) | **Shortened deliberately for the hackathon demo** so judges can join, propose, vote, and verify execution within a live evaluation session. |
| `EXECUTION_WINDOW` | `86400 seconds` (24 hours) | Grace period to execute passed proposals before expiration. |
| `QUORUM_BPS` | `5000` (50%) | Requires at least half of registered snapshot members to approve. |
| `MAX_SPEND_BPS` | `5000` (50%) | Prevents draining more than half of the treasury in a single decision. |

---

## 5. Known Tradeoffs (Disclosed Honestly)
1. **Sybil Resistance via Fee:** One-wallet-one-vote relies on the financial cost of `MEMBERSHIP_FEE`. Because all fees are locked in the treasury, attacking the vote costs more than the 50% spend cap yields.
2. **Non-Refundable Leave:** When a member leaves (`leave()`), their fee is not refunded. This preserves collective solvency and prevents sudden bank runs.
3. **Dynamic Balance Fluctuation:** If multiple passed proposals compete for funds and treasury balance drops below a proposal's amount or spend cap, execution safely reverts until more funds are deposited or the execution window expires.

---

## 6. Formal Test Suite & Invariants
Run the complete automated test suite locally:
```bash
npx hardhat test
```

### Verified Test Results (34/34 Passing):
- **Constructor & Immutability (2 tests):** Parameter validations and revert checks on invalid inputs.
- **Treasury Inflows & Contributions (3 tests):** `receive()` and `contribute()` accounting and 0-value reverts.
- **Membership Management (6 tests):** `join()` fee requirements, member count tracking, `leave()` fee forfeiture, and double-join reverts.
- **Proposals Creation & Validations (6 tests):** Member requirement, spend cap enforcement, recipient validation, and byte length constraints.
- **Voting Logic & Attack Vectors (7 tests):** Anti-flash-loan snapshot verification, double vote blocking, voting period boundaries, and defector rejection.
- **Execution & Safety Invariants (10 tests):**
  - Permissionless execution verification
  - Failed vote blocking (`yes <= no`)
  - Quorum failure blocking
  - Double execution blocking
  - **Reentrancy attack mitigation with `MaliciousRecipient.sol`**
  - Dynamic balance re-check under multiple concurrent proposals
  - Deployer zero-privilege proof

---

## 7. Local Development & Setup

### Prerequisites
- Node.js >= 20 (verified on Node `v24.21.0`)
- npm >= 10

### Installation
```bash
git clone https://github.com/Priyanshu-2308/VIBECHAIN.git
cd VIBECHAIN
npm install
```

### Run Tests
```bash
npm run test
```

### Run Local Frontend Dev Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

---

## 8. Frontend Architecture & Design System
Designed with the **Stitch "Treasury Monolith"** brutalist aesthetic:
- **Palette:** Signal Orange (`#FF4D1C`), Cobalt (`#1B1BFF`), Ink (`#141414`), and Bone (`#FCF9F8`).
- **Typography:** Anton (Headlines) and Space Grotesk (Body & Telemetry).
- **Three.js Monolith:** Rotating 3D wireframe geometric vault embedded into hero viewports with real-time HUD coordinates.
- **Public RPC Integration:** Frontend reads via `https://ethereum-sepolia-rpc.publicnode.com` and signs transactions via `window.ethereum` with zero API keys or secrets embedded.
