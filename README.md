# VIBECHAIN: Trustworthy Club Treasury

> **A decentralized, immutable Ethereum collective treasury where code is law. No owner. No admin. Rules only.**

[![Ethereum Sepolia](https://img.shields.io/badge/Network-Sepolia-blue)](https://sepolia.etherscan.io)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-363636)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Priyanshu-2308/VIBECHAIN/actions/workflows/deploy.yml/badge.svg)](https://github.com/Priyanshu-2308/VIBECHAIN/actions)

## Overview & Problem Statement
Shared club funds are traditionally susceptible to opaque custodianship, admin rug pulls, and unilateral withdrawals. **VIBECHAIN** solves this by deploying a radically autonomous, self-executing smart contract on Ethereum Sepolia.

Judges and participants can verify:
1. **Who can do what**: Only members can propose and vote. Contributions and execution are permissionless.
2. **How spending decisions are made**: Proposals snapshot active members at creation, enforce strict voting periods, and require both quorum (`QUORUM_BPS`) and majority approval (`yes > no`).
3. **Why no single person can misuse funds**: Zero owner, zero admin keys, zero upgradeability, zero backdoors. The deployer has 0 privileges post-deployment. Funds leave ONLY via `execute()`.
4. **Public Verification**: Every contribution, membership join/leave, proposal creation, vote, and execution emits on-chain events verifiable on Etherscan and in the live UI ledger.

## Live Deployment
- **Contract Address (Sepolia):** [`0xF48e84897C92387dc11b08058511BD3cc2B3B9c7`](https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7)
- **Deployment Block:** `12039018`
- **Etherscan Link:** [https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7](https://sepolia.etherscan.io/address/0xF48e84897C92387dc11b08058511BD3cc2B3B9c7)
- **Live dApp URL:** [https://priyanshu-2308.github.io/VIBECHAIN/](https://priyanshu-2308.github.io/VIBECHAIN/)

## Demo Parameters
- `MEMBERSHIP_FEE`: `0.001 ETH`
- `VOTING_PERIOD`: `300 seconds` (5 minutes) *(A 5-minute voting period was chosen deliberately for hackathon demo evaluation so judges can create proposals, vote, and see them become executable within the judging session)*
- `EXECUTION_WINDOW`: `86400 seconds` (24 hours)
- `QUORUM_BPS`: `5000` (50% of snapshot members must vote YES)
- `MAX_SPEND_BPS`: `5000` (50% max treasury spend cap per proposal)

## Known Tradeoffs
1. **Sybil Resistance via Fee**: One-wallet-one-vote relies on economic cost (`MEMBERSHIP_FEE`).
2. **Non-Refundable Leave**: Leaving the treasury does not return the membership fee, protecting collective reserves against ragequits during active commitments.
3. **Dynamic Balance Check**: If a passed proposal's requested amount exceeds the treasury's balance (or spend cap) at execution time, execution reverts until funds are deposited or the execution window expires.

## Safety Invariants & Formal Testing
- **Solvency**: Treasury never pays out more than its balance.
- **Single Execution**: A proposal can be executed at most once.
- **Consensus Required**: Failed, expired, or unapproved proposals cannot move funds.
- **Reentrancy Protection**: Checks-Effects-Interactions pattern enforced with OpenZeppelin `ReentrancyGuard`.
- **Test Suite**: 34 automated unit and attack-simulation tests passing (`npx hardhat test`).

---
*Built with Vite + React + ethers.js + Three.js + Hardhat + Tailwind CSS.*
