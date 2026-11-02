import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Header from "./components/Header.jsx";
import Navigation from "./components/Navigation.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Membership from "./components/Membership.jsx";
import Proposals from "./components/Proposals.jsx";
import NewProposal from "./components/NewProposal.jsx";
import Ledger from "./components/Ledger.jsx";
import {
  getReadOnlyContract,
  getSignerContract,
  checkAndSwitchNetwork,
  getPublicProvider,
} from "./utils/ethereum.js";
import contractData from "./contract.json";

async function fetchWithRetry(queryFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  return [];
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [account, setAccount] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [joinedTimestamp, setJoinedTimestamp] = useState(0);
  const [treasuryBalance, setTreasuryBalance] = useState("0.000");
  const [memberCount, setMemberCount] = useState(0);
  const [proposalCount, setProposalCount] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingOlderHistory, setIsLoadingOlderHistory] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [parameters, setParameters] = useState({
    membershipFeeWei: contractData.parameters?.membershipFeeWei || "1000000000000000",
    membershipFeeEth: contractData.parameters?.membershipFeeEth || "0.001",
    votingPeriodSeconds: contractData.parameters?.votingPeriodSeconds || 300,
    executionWindowSeconds: contractData.parameters?.executionWindowSeconds || 86400,
    quorumBps: contractData.parameters?.quorumBps || 5000,
    maxSpendBps: contractData.parameters?.maxSpendBps || 5000,
  });

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("No Ethereum browser wallet found. Please install MetaMask or Rabby.");
      return;
    }
    try {
      setIsConnecting(true);
      await checkAndSwitchNetwork();
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0].toLowerCase());
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if already connected on load
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0].toLowerCase());
          }
        })
        .catch(console.error);

      window.ethereum.on("accountsChanged", (accs) => {
        if (accs && accs.length > 0) {
          setAccount(accs[0].toLowerCase());
        } else {
          setAccount("");
        }
      });
    }
  }, []);

  // Fetch contract data & dynamic parameters from getters
  const loadContractData = useCallback(async () => {
    const contract = getReadOnlyContract();
    if (!contract) return;

    try {
      // Balance, members, proposals
      const [bal, mCount, pCount] = await Promise.all([
        contract.treasuryBalance(),
        contract.memberCount(),
        contract.proposalCount(),
      ]);

      setTreasuryBalance(ethers.formatEther(bal));
      setMemberCount(Number(mCount));
      const count = Number(pCount);
      setProposalCount(count);

      // Fetch dynamic parameters from getters
      try {
        const [fee, vPeriod, eWindow, qBps, maxSpend] = await Promise.all([
          contract.MEMBERSHIP_FEE(),
          contract.VOTING_PERIOD(),
          contract.EXECUTION_WINDOW(),
          contract.QUORUM_BPS(),
          contract.MAX_SPEND_BPS(),
        ]);
        setParameters({
          membershipFeeWei: fee.toString(),
          membershipFeeEth: ethers.formatEther(fee),
          votingPeriodSeconds: Number(vPeriod),
          executionWindowSeconds: Number(eWindow),
          quorumBps: Number(qBps),
          maxSpendBps: Number(maxSpend),
        });
      } catch (paramErr) {
        console.warn("Could not read dynamic parameters, fallback to config:", paramErr);
      }

      // Load all proposals directly from contract state (always complete, independent of event log window)
      const propList = [];
      for (let i = 1; i <= count; i++) {
        try {
          const [prop, st, userHasVoted] = await Promise.all([
            contract.getProposal(i),
            contract.status(i),
            account ? contract.hasVoted(i, account) : Promise.resolve(false),
          ]);
          const statusLabels = ["ACTIVE", "PASSED", "REJECTED", "EXPIRED", "EXECUTED"];
          propList.push({
            id: i,
            proposer: prop.proposer,
            recipient: prop.recipient,
            amount: prop.amount,
            purpose: prop.purpose,
            createdAt: Number(prop.createdAt),
            votingEnds: Number(prop.votingEnds),
            expiresAt: Number(prop.expiresAt),
            snapshotMembers: Number(prop.snapshotMembers),
            yesVotes: Number(prop.yesVotes),
            noVotes: Number(prop.noVotes),
            executed: prop.executed,
            statusCode: Number(st),
            statusText: statusLabels[Number(st)] || "UNKNOWN",
            hasVoted: Boolean(userHasVoted),
          });
        } catch (e) {
          console.error(`Error loading proposal ${i}:`, e);
        }
      }
      setProposals(propList.reverse()); // most recent first

      // Check user membership
      if (account) {
        const [isM, jAt] = await Promise.all([
          contract.isMember(account),
          contract.joinedAt(account),
        ]);
        setIsMember(isM);
        setJoinedTimestamp(Number(jAt));
      } else {
        setIsMember(false);
        setJoinedTimestamp(0);
      }
    } catch (err) {
      console.error("Failed to load on-chain treasury state:", err);
    }
  }, [account]);

  // Load on-chain event logs with chunking (max 4,500 blocks/chunk) and retry/backoff
  const loadEvents = useCallback(async () => {
    const contract = getReadOnlyContract();
    if (!contract) return;

    try {
      setIsLoadingEvents(true);
      const provider = getPublicProvider();
      const currentBlock = await provider.getBlockNumber();
      const deployBlock = contractData.deployBlock || 0;
      const CHUNK_SIZE = 4500;

      if (currentBlock - deployBlock > CHUNK_SIZE) {
        setIsLoadingOlderHistory(true);
      }

      const parsedEvents = [];

      for (let from = deployBlock; from <= currentBlock; from += CHUNK_SIZE) {
        const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);

        try {
          const [contributed, joined, left, propCreated, voted, executed] =
            await Promise.all([
              fetchWithRetry(() =>
                contract.queryFilter(contract.filters.Contributed(), from, to)
              ),
              fetchWithRetry(() =>
                contract.queryFilter(contract.filters.Joined(), from, to)
              ),
              fetchWithRetry(() =>
                contract.queryFilter(contract.filters.Left(), from, to)
              ),
              fetchWithRetry(() =>
                contract.queryFilter(contract.filters.ProposalCreated(), from, to)
              ),
              fetchWithRetry(() =>
                contract.queryFilter(contract.filters.Voted(), from, to)
              ),
              fetchWithRetry(() =>
                contract.queryFilter(contract.filters.Executed(), from, to)
              ),
            ]);

          contributed.forEach((e) => {
            parsedEvents.push({
              name: "Contributed",
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              details: `Inflow from ${e.args.from}: +${ethers.formatEther(e.args.amount)} ETH`,
            });
          });

          joined.forEach((e) => {
            parsedEvents.push({
              name: "Joined",
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              details: `New Member ${e.args.member} staked ${ethers.formatEther(e.args.feePaid)} ETH`,
            });
          });

          left.forEach((e) => {
            parsedEvents.push({
              name: "Left",
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              details: `Member departed: ${e.args.member}. Privileges revoked.`,
            });
          });

          propCreated.forEach((e) => {
            parsedEvents.push({
              name: "ProposalCreated",
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              details: `Proposal #${e.args.id} created by ${e.args.proposer} for ${ethers.formatEther(e.args.amount)} ETH: "${e.args.purpose}". Snapshot: ${e.args.snapshotMembers} members.`,
            });
          });

          voted.forEach((e) => {
            parsedEvents.push({
              name: "Voted",
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              details: `Voter ${e.args.voter} cast vote [${e.args.support ? "YES" : "NO"}] on Proposal #${e.args.id}`,
            });
          });

          executed.forEach((e) => {
            parsedEvents.push({
              name: "Executed",
              blockNumber: e.blockNumber,
              txHash: e.transactionHash,
              details: `Outflow Executed: Proposal #${e.args.id} sent ${ethers.formatEther(e.args.amount)} ETH to ${e.args.recipient} for "${e.args.purpose}"`,
            });
          });
        } catch (chunkErr) {
          console.warn(`Error querying chunk ${from}-${to}:`, chunkErr);
        }
      }

      parsedEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(parsedEvents);
    } catch (err) {
      console.error("Failed to fetch on-chain event logs:", err);
    } finally {
      setIsLoadingEvents(false);
      setIsLoadingOlderHistory(false);
    }
  }, []);

  useEffect(() => {
    loadContractData();
    loadEvents();
    const interval = setInterval(() => {
      loadContractData();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadContractData, loadEvents]);

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased selection:bg-primary selection:text-white">
      {/* Top Fixed Header */}
      <Header
        account={account}
        isMember={isMember}
        isConnecting={isConnecting}
        onConnect={connectWallet}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 md:pt-32 max-w-6xl mx-auto">
        {activeTab === "dashboard" && (
          <Dashboard
            treasuryBalance={treasuryBalance}
            memberCount={memberCount}
            proposalCount={proposalCount}
            parameters={parameters}
            account={account}
            onConnect={connectWallet}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "membership" && (
          <Membership
            account={account}
            isMember={isMember}
            parameters={parameters}
            treasuryBalance={treasuryBalance}
            onRefresh={() => {
              loadContractData();
              loadEvents();
            }}
            onConnect={connectWallet}
          />
        )}

        {activeTab === "proposals" && (
          <Proposals
            proposals={proposals}
            account={account}
            isMember={isMember}
            joinedTimestamp={joinedTimestamp}
            parameters={parameters}
            treasuryBalance={treasuryBalance}
            onRefresh={() => {
              loadContractData();
              loadEvents();
            }}
            onConnect={connectWallet}
          />
        )}

        {activeTab === "new-allocation" && (
          <NewProposal
            account={account}
            isMember={isMember}
            memberCount={memberCount}
            parameters={parameters}
            treasuryBalance={treasuryBalance}
            onRefresh={() => {
              loadContractData();
              loadEvents();
            }}
            onConnect={connectWallet}
            onProposalCreated={() => {
              setActiveTab("proposals");
            }}
          />
        )}

        {activeTab === "ledger" && (
          <Ledger
            events={events}
            parameters={parameters}
            isLoadingEvents={isLoadingEvents}
            isLoadingOlderHistory={isLoadingOlderHistory}
            onRefresh={loadEvents}
          />
        )}
      </main>

      {/* Bottom (Mobile) / Secondary (Desktop) Fixed Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
