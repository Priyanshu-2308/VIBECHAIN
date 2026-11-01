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
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Fetch contract data
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

      // Load all proposals
      const propList = [];
      for (let i = 1; i <= count; i++) {
        try {
          const [prop, st] = await Promise.all([
            contract.getProposal(i),
            contract.status(i),
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

  // Load on-chain event logs for transparency audit
  const loadEvents = useCallback(async () => {
    const contract = getReadOnlyContract();
    if (!contract) return;

    try {
      setIsLoadingEvents(true);
      const provider = getPublicProvider();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = contractData.deployBlock
        ? Math.max(0, contractData.deployBlock)
        : Math.max(0, currentBlock - 5000);

      const [contributed, joined, left, propCreated, voted, executed] =
        await Promise.all([
          contract.queryFilter(contract.filters.Contributed(), fromBlock, "latest"),
          contract.queryFilter(contract.filters.Joined(), fromBlock, "latest"),
          contract.queryFilter(contract.filters.Left(), fromBlock, "latest"),
          contract.queryFilter(contract.filters.ProposalCreated(), fromBlock, "latest"),
          contract.queryFilter(contract.filters.Voted(), fromBlock, "latest"),
          contract.queryFilter(contract.filters.Executed(), fromBlock, "latest"),
        ]);

      const parsedEvents = [];

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

      parsedEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(parsedEvents);
    } catch (err) {
      console.error("Failed to fetch on-chain event logs:", err);
    } finally {
      setIsLoadingEvents(false);
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
            account={account}
            onConnect={connectWallet}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "membership" && (
          <Membership
            account={account}
            isMember={isMember}
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
            isLoadingEvents={isLoadingEvents}
            onRefresh={loadEvents}
          />
        )}
      </main>

      {/* Bottom (Mobile) / Secondary (Desktop) Fixed Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
