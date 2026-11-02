import React, { useState } from "react";
import { ethers } from "ethers";
import ThreeMonolith from "./ThreeMonolith.jsx";
import { getSignerContract, checkAndSwitchNetwork } from "../utils/ethereum.js";

const STATUS_LABELS = ["ACTIVE", "PASSED", "REJECTED", "EXPIRED", "EXECUTED"];

export default function Proposals({
  proposals = [],
  account,
  isMember,
  joinedTimestamp,
  treasuryBalance = "0",
  onRefresh,
  onConnect,
}) {
  const [selectedId, setSelectedId] = useState(proposals.length > 0 ? proposals[0].id : null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState("");

  const currentProposal = proposals.find((p) => p.id === selectedId) || proposals[0];

  const handleVote = async (support) => {
    if (!account) return onConnect();
    if (!currentProposal) return;

    try {
      setIsLoading(true);
      setToast("Requesting vote signature...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.vote(currentProposal.id, support);
      setToast(`Vote transaction dispatched: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setToast(`Vote cast: ${support ? "YES" : "NO"} on Proposal #${currentProposal.id}`);
      await onRefresh();
    } catch (err) {
      console.error(err);
      setToast(`Vote Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!account) return onConnect();
    if (!currentProposal) return;

    try {
      setIsLoading(true);
      setToast("Broadcasting permissionless execution call...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.execute(currentProposal.id);
      setToast(`Execution tx dispatched: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setToast(`PROPOSAL #${currentProposal.id} EXECUTED ON-CHAIN! Funds routed to recipient.`);
      await onRefresh();
    } catch (err) {
      console.error(err);
      setToast(`Execution Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if member joined after proposal createdAt
  const cannotVoteReason = () => {
    if (!account) return "Wallet not connected. Connect to vote.";
    if (!isMember) return "Only active club members can vote on proposals.";
    if (!currentProposal) return "";
    if (currentProposal.hasVoted) {
      return "You have already cast your vote on this proposal.";
    }
    if (joinedTimestamp && BigInt(joinedTimestamp) > BigInt(currentProposal.createdAt)) {
      return `Wallet joined at timestamp ${joinedTimestamp}, which is after proposal snapshot (${currentProposal.createdAt}). Antigravity snapshot voting rules prohibit retroactive voting.`;
    }
    if (currentProposal.statusCode !== 0) {
      return `Voting period has ended for this proposal. Status is ${currentProposal.statusText}.`;
    }
    return null;
  };

  const cantVote = cannotVoteReason();

  const totalVotes = currentProposal
    ? Number(currentProposal.yesVotes) + Number(currentProposal.noVotes)
    : 0;
  const yesRatio =
    totalVotes > 0
      ? ((Number(currentProposal.yesVotes) / totalVotes) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="flex flex-col w-full pb-24 md:pb-12 bg-ink text-bone">
      {/* Top Header & Telemetry */}
      <div className="w-full p-4 md:p-6 flex flex-col gap-3 bg-ink border-b border-surface-variant/20">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-tertiary-fixed-dim uppercase tracking-widest">
            [VAULT RUNTIME: SEPOLIA]
          </span>
          <span className="font-mono text-xs text-primary uppercase font-bold flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-primary" />
            QUORUM 50%
          </span>
        </div>
        <h1 className="font-headline text-4xl md:text-5xl uppercase tracking-tight text-white leading-none m-0">
          PROPOSALS ({proposals.length.toString().padStart(2, "0")})
        </h1>
        <p className="font-mono text-xs text-gray-400 uppercase tracking-wider">
          AUTONOMOUS ETHEREUM CONSENSUS // NON-REVOCABLE WEIGHT
        </p>
      </div>

      {/* 3D Wireframe Monolith 04 */}
      <div className="w-full px-4 py-2 bg-ink">
        <ThreeMonolith variant="04" height="h-32 md:h-40" color={0xff4d1c} />
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="mx-4 my-2 p-3 bg-primary/20 border-2 border-primary text-white font-mono text-xs uppercase flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="font-bold underline ml-2">
            DISMISS
          </button>
        </div>
      )}

      {/* Proposals List (Horizontal Brutalist Ledger Rows) */}
      <div className="w-full flex flex-col bg-ink border-y border-white/20">
        <div className="w-full px-4 py-2 flex items-center justify-between bg-white/5 font-mono text-xs text-gray-400 uppercase tracking-wider">
          <span>LEDGER REGISTER</span>
          <span className="text-primary font-bold">SNAPSHOT ACTIVE</span>
        </div>

        {proposals.length === 0 ? (
          <div className="p-8 text-center font-mono text-sm text-gray-500 uppercase">
            NO PROPOSALS REGISTERED ON-CHAIN YET. USE "NEW" TAB TO SUBMIT ONE.
          </div>
        ) : (
          proposals.map((p) => {
            const isSelected = currentProposal && currentProposal.id === p.id;
            const badgeColor =
              p.statusText === "ACTIVE"
                ? "bg-primary/20 text-primary border-primary"
                : p.statusText === "PASSED"
                ? "bg-secondary/20 text-secondary border-secondary"
                : p.statusText === "EXECUTED"
                ? "bg-green-900/30 text-green-400 border-green-500"
                : "bg-gray-800 text-gray-400 border-gray-600";

            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left transition-none px-4 py-3 flex flex-col gap-1 border-b border-white/10 ${
                  isSelected ? "bg-white/15" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline text-lg uppercase text-white">
                      #{p.id.toString().padStart(3, "0")}
                    </span>
                    <span className="font-headline text-lg uppercase text-white tracking-tight truncate max-w-xs md:max-w-md">
                      {p.purpose}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] tracking-wider border px-2 py-0.5 uppercase font-bold ${badgeColor}`}
                  >
                    {p.statusText}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs text-gray-400">
                  <span className="text-white font-medium">
                    {ethers.formatEther(p.amount)} ETH
                  </span>
                  <span>
                    YES: {p.yesVotes.toString()} / NO: {p.noVotes.toString()}
                  </span>
                  <span className="text-primary uppercase">
                    SNAPSHOT: {p.snapshotMembers.toString()} VOTERS
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected Proposal Detail Inspector */}
      {currentProposal && (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-4 bg-ink">
          <div className="flex flex-col gap-1 border-b border-white/20 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-primary uppercase font-bold tracking-widest">
                // DETAIL INSPECTOR
              </span>
              <span className="font-mono text-xs px-2 py-0.5 border border-primary text-primary font-bold uppercase">
                {currentProposal.statusText}
              </span>
            </div>
            <h2 className="font-headline text-2xl md:text-3xl uppercase text-white leading-tight m-0">
              #{currentProposal.id.toString().padStart(3, "0")} {currentProposal.purpose}
            </h2>
            <div className="font-mono text-xs text-gray-400 uppercase tracking-wider flex flex-wrap gap-4 mt-1">
              <span>ALLOCATION: {ethers.formatEther(currentProposal.amount)} ETH</span>
              <span>RECIPIENT: {currentProposal.recipient}</span>
              <span>PROPOSER: {currentProposal.proposer}</span>
            </div>
          </div>

          {/* Consensus Tally Progress Bar */}
          <div className="w-full bg-white/5 border border-white/20 p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-white uppercase tracking-wider font-bold">
                CONSENSUS TALLY
              </span>
              <span className="font-mono text-xs text-white font-bold">
                YES {yesRatio}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-800 overflow-hidden flex">
              <div
                className="h-full bg-primary transition-none"
                style={{ width: `${yesRatio}%` }}
              />
              <div
                className="h-full bg-gray-600 transition-none"
                style={{ width: `${100 - parseFloat(yesRatio)}%` }}
              />
            </div>
            <div className="flex justify-between items-center font-mono text-[11px] text-gray-400">
              <span>YES: {currentProposal.yesVotes.toString()} VOTES</span>
              <span>NO: {currentProposal.noVotes.toString()} VOTES</span>
            </div>
          </div>

          {/* Voting Ineligibility Notice (if applicable) */}
          {cantVote && (
            <div className="w-full bg-white/5 border border-white/20 text-white p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">
                  info
                </span>
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-white">
                  VOTING NOTICE
                </span>
              </div>
              <p className="font-body text-xs text-gray-400 m-0 leading-relaxed">
                {cantVote}
              </p>
            </div>
          )}

          {/* Capital Deficit Alert if Passed but under-collateralized */}
          {currentProposal.statusText === "PASSED" &&
            (parseFloat(treasuryBalance) < parseFloat(ethers.formatEther(currentProposal.amount)) ||
              parseFloat(ethers.formatEther(currentProposal.amount)) > parseFloat(treasuryBalance) * 0.5) && (
              <div className="w-full bg-amber-500/10 border-2 border-amber-500 text-amber-300 p-3 flex items-start gap-2 font-mono text-xs uppercase">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>
                  TREASURY NOTICE: Proposal approved by community, but requires treasury balance of at least {(parseFloat(ethers.formatEther(currentProposal.amount)) * 2).toFixed(4)} ETH to satisfy the 50% max spend ceiling. Deposit ETH to enable execution.
                </span>
              </div>
            )}

          {/* Action Buttons: Vote YES / Vote NO */}
          <div className="w-full flex flex-col gap-3 pt-2">
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => handleVote(true)}
                disabled={Boolean(cantVote) || isLoading}
                className={`w-full h-12 font-headline text-lg uppercase tracking-wider flex items-center justify-center border-2 border-primary transition-none ${
                  cantVote || isLoading
                    ? "opacity-40 cursor-not-allowed bg-white/5 text-gray-400 border-gray-600"
                    : "bg-primary text-white hover:bg-primary-dark"
                }`}
              >
                {currentProposal.hasVoted ? "VOTED" : "VOTE YES"}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={Boolean(cantVote) || isLoading}
                className={`w-full h-12 font-headline text-lg uppercase tracking-wider flex items-center justify-center border-2 border-white transition-none ${
                  cantVote || isLoading
                    ? "opacity-40 cursor-not-allowed bg-white/5 text-gray-400 border-gray-600"
                    : "bg-white text-ink hover:bg-gray-200"
                }`}
              >
                {currentProposal.hasVoted ? "VOTED" : "VOTE NO"}
              </button>
            </div>

            {/* Execute Proposal Button */}
            {(() => {
              const propEth = parseFloat(ethers.formatEther(currentProposal.amount));
              const balEth = parseFloat(treasuryBalance);
              const isSpendCapOk = propEth <= balEth && propEth <= balEth * 0.5;
              const isExecutable = currentProposal.statusText === "PASSED" && isSpendCapOk;

              return (
                <button
                  onClick={handleExecute}
                  disabled={!isExecutable || isLoading}
                  className={`w-full h-14 font-headline text-xl uppercase tracking-wider flex items-center justify-center transition-none border-2 ${
                    isExecutable
                      ? "bg-secondary text-white hover:bg-secondary-dark border-secondary cursor-pointer"
                      : currentProposal.statusText === "PASSED"
                      ? "bg-amber-900/40 text-amber-300 border-amber-600 cursor-not-allowed"
                      : currentProposal.statusText === "EXECUTED"
                      ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                      : "bg-white/5 text-gray-500 border-gray-800 cursor-not-allowed"
                  }`}
                >
                  {isLoading
                    ? "BROADCASTING EXECUTION..."
                    : isExecutable
                    ? "EXECUTE PROPOSAL (PERMISSIONLESS)"
                    : currentProposal.statusText === "PASSED"
                    ? "TREASURY DEFICIT (NEEDS CAPITAL FOR 50% CAP)"
                    : currentProposal.statusText === "EXECUTED"
                    ? "PROPOSAL ALREADY EXECUTED"
                    : `CANNOT EXECUTE (STATUS: ${currentProposal.statusText})`}
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

