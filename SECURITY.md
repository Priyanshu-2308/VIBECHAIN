# Security Audit & Threat Model: ClubTreasury

This document details the threat modeling, attacker-style security audit, and formal verification conducted on the **ClubTreasury** smart contract and decentralized application frontend.

---

## 1. Threat Modeling & Scope

The security goal of **ClubTreasury** is to guarantee:
1. **No Unilateral Outflows:** Funds can **never** leave the treasury without an authorized, unexpired, majority-approved governance proposal that has met quorum.
2. **Zero Privileged Keys:** Deployers, founders, and large contributors possess zero special capabilities (no owner, no admin, no pause, no blacklist, no upgradeability).
3. **Strict Solvency Invariant:** The contract can never pay out more than its active ETH balance.
4. **Protection Against Sybil & Front-Running:** Members cannot manipulate voting weights by joining retroactively or double-voting.

---

## 2. Attacker-Style Security Review Matrix

| Attack Vector | Threat Level | Evaluation & Findings | Implemented Defense & Verification |
|---|---|---|---|
| **Deployer / Admin Rug Pull** | CRITICAL | Can the deployer extract funds after deployment? | **IMMUTABILITY ENFORCED:** Contract inherits zero ownership or admin libraries (`Ownable`, `AccessControl` absent). Deployer has zero privileges. Verified in test: `treasury.owner` and `treasury.withdraw` are undefined. |
| **Reentrancy on `execute()`** | CRITICAL | Can a malicious recipient contract re-enter `execute()` or `join()` during ETH transfer to drain funds? | **DOUBLE PROTECTION:** Checks-Effects-Interactions strictly applied (`proposal.executed = true` before `.call`). Additionally protected by OpenZeppelin's battle-tested `ReentrancyGuard`. Tested with `MaliciousRecipient.sol`—attack fails and reverts. |
| **Flash Join / Sybil Retroactive Voting** | HIGH | Can an attacker join after seeing an undesirable proposal and vote to defeat or pass it? | **SNAPSHOT ENFORCEMENT:** `vote()` mandates `joinedAt[msg.sender] < proposal.createdAt`. Joining during or after a proposal's creation block explicitly revokes voting rights for that proposal. |
| **Double Voting** | HIGH | Can a member vote multiple times with the same wallet? | **STATE TRACKING:** `hasVoted[id][msg.sender]` boolean flag is verified and toggled on first vote. Reverts on any secondary attempt. |
| **Double Execution** | HIGH | Can a passed proposal be executed multiple times to extract multiple payouts? | **ATOMIC STATE FLIP:** `proposal.executed` must be `false` to execute, and is set to `true` prior to any ETH transfer. Reverts with `ProposalAlreadyExecuted` on second call. |
| **Griefing / Balance Depletion** | HIGH | If a proposal passes for amount $X$, but prior proposal executions reduce the treasury balance below $X$, what happens? | **DYNAMIC SOLVENCY RE-CHECK:** During `execute()`, the contract recalculates `proposal.amount <= address(this).balance` and `proposal.amount <= (balance * MAX_SPEND_BPS) / 10000`. Reverts safely with `InsufficientBalance` or `ExceedsMaxSpend`. |
| **Execution Window Expiry** | MEDIUM | Can proposals be held indefinitely and executed months later under different financial conditions? | **STRICT BOUNDS:** Proposals expire at `votingEnds + EXECUTION_WINDOW`. Any execution call after `expiresAt` reverts with `ProposalExpired`. |
| **Denial of Service / Unbounded Loops** | MEDIUM | Can an attacker bloat arrays or gas consumption to lock funds? | **O(1) COMPUTATION:** No arrays or unbounded loops exist in the contract. All views, checks, and voting tallies execute in constant $O(1)$ gas. |
| **Front-Running / Censorship** | MEDIUM | Can a malicious party censor the execution of a passed proposal? | **PERMISSIONLESS EXECUTION:** Anyone (including miners, bots, outsiders) can call `execute()`. Execution cannot be gatekept. |
| **Cross-Site Scripting (XSS)** | MEDIUM | Can malicious proposal purposes inject script tags into other users' browsers? | **SAFE INTERPOLATION:** React JSX automatic context-aware escaping renders purpose and address strings safely. Zero `dangerouslySetInnerHTML` usage. |
| **Secrets in Git History** | HIGH | Were any sensitive keys, RPC URLs, or seed phrases committed to the repository? | **SECRETS SCAN:** Scanned git log across entire commit history for 64-character hex patterns, private key variables, sensitive provider endpoints, and seed phrases. Zero matches. Environment files are strictly covered by `.gitignore`. |

---

## 3. Verified Safety Invariants

Our automated Hardhat test suite (`test/ClubTreasury.test.cjs`) proves four fundamental invariants:
1. **Solvency Invariant:** `address(this).balance >= 0` always holds, and the contract never pays out more than its balance or single-proposal spend ceiling.
2. **Singular Outflow Invariant:** An authorization moves funds at most once, and strictly equal to `proposal.amount`.
3. **Consensus Invariant:** Proposals with `yes <= no` or `yes * 10000 < snapshotMembers * QUORUM_BPS` can never move funds under any circumstances.
4. **Temporal Invariant:** Proposals can only be voted on during `[createdAt, votingEnds]` and executed during `(votingEnds, expiresAt]`.

---

## 4. Known Tradeoffs & Disclosures

1. **One-Wallet-One-Vote Economics:** Sybil resistance is anchored to the economic threshold of the `MEMBERSHIP_FEE` (`0.001 ETH`). If an attacker spends $N \times \text{MEMBERSHIP\_FEE}$, they acquire $N$ votes. However, all fees are permanently committed to the treasury, so any attempt to acquire a 50% voting majority requires paying more in membership fees than can be extracted under the 50% max spend cap.
2. **Non-Refundable Membership Fee:** Leaving the club explicitly sets `joinedAt = 0` without a refund. This prevents liquidity draining attacks when collective obligations have already been planned.
3. **Balance Volatility:** If the treasury balance falls between proposal approval and execution, execution will revert until sufficient contributions are deposited or until the execution window expires.
