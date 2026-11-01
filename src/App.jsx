import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Header from "./components/Header.jsx";
import Navigation from "./components/Navigation.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Proposals from "./components/Proposals.jsx";
import NewProposal from "./components/NewProposal.jsx";
import Ledger from "./components/Ledger.jsx";
import {
  getReadOnlyContract,
  checkAndSwitchNetwork,
  getPublicProvider,
} from "./utils/ethereum.js";
import contractData from "./contract.json";

export default function App() {
  const [activeTab, setActiveTab] = useState("pot");
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

  // Check accounts on load and listen to account changes
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
      const [bal, mCount, pCount] = await Promise.all([
        contract.treasuryBalance(),
        contract.memberCount(),
        contract.proposalCount(),
      ]);

      setTreasuryBalance(ethers.formatEther(bal));
      setMemberCount(Number(mCount));
      const count = Number(pCount);
      setProposalCount(count);

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
          console.error(`Error loading request ${i}:`, e);
        }
      }
      setProposals(propList.reverse());

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
      console.error("Failed to load on-chain collective state:", err);
    }
  }, [account]);

  // Load on-chain event logs for notebook
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
          details: `Gift to pot from ${e.args.from}: +${ethers.formatEther(e.args.amount)} ETH`,
        });
      });

      joined.forEach((e) => {
        parsedEvents.push({
          name: "Joined",
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
          details: `New member seated at table: ${e.args.member} (Pledged ${ethers.formatEther(e.args.feePaid)} ETH)`,
        });
      });

      left.forEach((e) => {
        parsedEvents.push({
          name: "Left",
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
          details: `Member stepped away: ${e.args.member}`,
        });
      });

      propCreated.forEach((e) => {
        parsedEvents.push({
          name: "ProposalCreated",
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
          details: `Request #${e.args.id} placed by ${e.args.proposer} for ${ethers.formatEther(e.args.amount)} ETH: "${e.args.purpose}". Snapshot: ${e.args.snapshotMembers} voters.`,
        });
      });

      voted.forEach((e) => {
        parsedEvents.push({
          name: "Voted",
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
          details: `Hand shown [${e.args.support ? "Yes" : "Pass"}] on Request #${e.args.id} by ${e.args.voter}`,
        });
      });

      executed.forEach((e) => {
        parsedEvents.push({
          name: "Executed",
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
          details: `Settled & Released: Request #${e.args.id} sent ${ethers.formatEther(e.args.amount)} ETH to ${e.args.recipient} for "${e.args.purpose}"`,
        });
      });

      parsedEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(parsedEvents);
    } catch (err) {
      console.error("Failed to load notebook logs:", err);
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
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Header */}
      <Header
        account={account}
        isMember={isMember}
        isConnecting={isConnecting}
        onConnect={connectWallet}
      />

      {/* Main Single-Column Narrative Viewport */}
      <main className="w-full max-w-[580px] mx-auto px-6 pt-20 pb-28 flex-1 flex flex-col items-center justify-center">
        {activeTab === "pot" && (
          <Dashboard
            treasuryBalance={treasuryBalance}
            memberCount={memberCount}
            proposalCount={proposalCount}
            account={account}
            isMember={isMember}
            onConnect={connectWallet}
            onRefresh={() => {
              loadContractData();
              loadEvents();
            }}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "requests" && (
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

        {activeTab === "new" && (
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
              setActiveTab("requests");
            }}
          />
        )}

        {activeTab === "notebook" && (
          <Ledger
            events={events}
            isLoadingEvents={isLoadingEvents}
            onRefresh={loadEvents}
          />
        )}
      </main>

      {/* Navigation Footer */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
