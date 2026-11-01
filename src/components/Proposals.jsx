import React, { useState } from "react";
import { ethers } from "ethers";
import { getSignerContract, checkAndSwitchNetwork } from "../utils/ethereum.js";

export default function Proposals({
  proposals = [],
  account,
  isMember,
  joinedTimestamp,
  onRefresh,
  onConnect,
}) {
  const [selectedId, setSelectedId] = useState(proposals.length > 0 ? proposals[0].id : null);
  const [showArchive, setShowArchive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const activeProposal = proposals.find((p) => p.statusCode === 0) || proposals[0];
  const currentProposal = proposals.find((p) => p.id === selectedId) || activeProposal;

  const handleVote = async (support) => {
    if (!account) return onConnect();
    if (!currentProposal) return;

    try {
      setIsLoading(true);
      setMsg("Recording your show of hands...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.vote(currentProposal.id, support);
      setMsg(`Vote broadcast: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setMsg(`Your hand has been recorded gently (${support ? "Yes" : "Pass"}).`);
      await onRefresh();
    } catch (err) {
      console.error(err);
      setMsg(`Vote failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!account) return onConnect();
    if (!currentProposal) return;

    try {
      setIsLoading(true);
      setMsg("Releasing collective funds...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.execute(currentProposal.id);
      setMsg(`Outflow dispatched: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setMsg("Funds released to recipient! The request is settled.");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setMsg(`Execution failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cannotVoteReason = () => {
    if (!account) return "Connect wallet to participate.";
    if (!isMember) return "Only active members at the table can vote.";
    if (!currentProposal) return "";
    if (joinedTimestamp && BigInt(joinedTimestamp) >= BigInt(currentProposal.createdAt)) {
      return "Joined after this request was placed on the table (snapshot voting rule).";
    }
    if (currentProposal.statusCode !== 0) {
      return `Decision window closed (Status: ${currentProposal.statusText}).`;
    }
    return null;
  };

  const cantVote = cannotVoteReason();

  const yesCount = currentProposal ? Number(currentProposal.yesVotes) : 0;
  const noCount = currentProposal ? Number(currentProposal.noVotes) : 0;
  const snapshotCount = currentProposal ? Math.max(1, Number(currentProposal.snapshotMembers)) : 1;
  const awaitingCount = Math.max(0, snapshotCount - (yesCount + noCount));

  return (
    <div className="w-full flex flex-col items-center justify-center py-6">
      {/* Top Banner Tag */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
        <span className="font-body text-[11px] tracking-wider uppercase text-on-surface-variant">
          Collective Decisions • {proposals.filter((p) => p.statusCode === 0).length} Open
        </span>
      </div>

      {msg && (
        <div className="w-full max-w-[460px] mb-4 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-primary font-body text-xs flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="font-bold underline ml-2">
            ×
          </button>
        </div>
      )}

      {/* Main Single Request Card */}
      {!currentProposal ? (
        <div className="w-full max-w-[460px] bg-surface-container-lowest p-8 sm:p-10 rounded-xl shadow-sm text-center">
          <p className="font-headline text-lg text-primary mb-2">The table is currently quiet</p>
          <p className="font-body text-xs text-on-surface-variant">
            No spending requests are open right now. You can place one on the table using the "New Request" tab.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-[460px] bg-surface-container-lowest p-8 sm:p-10 rounded-xl shadow-sm border border-outline-variant/30 transition-all text-center">
          <div className="mb-2">
            <span className="font-body text-[11px] uppercase tracking-wider text-secondary">
              Community Request #{currentProposal.id}
            </span>
          </div>

          <h1 className="font-headline text-2xl sm:text-3xl text-primary tracking-tight mb-2">
            {currentProposal.purpose}
          </h1>

          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-display text-4xl text-primary tracking-tight font-light">
              {ethers.formatEther(currentProposal.amount)}
            </span>
            <span className="font-body text-xs text-on-surface-variant uppercase tracking-widest mt-2">
              ETH
            </span>
          </div>

          <p className="font-body text-xs text-on-surface-variant mb-6 flex items-center justify-center gap-1.5 flex-wrap">
            <span>By {currentProposal.proposer.slice(0, 6)}...{currentProposal.proposer.slice(-4)}</span>
            <span>•</span>
            <span className="font-mono text-secondary">
              Status: {currentProposal.statusText}
            </span>
          </p>

          {/* Show of Hands Consensus Tally */}
          <div className="bg-surface-container-low/70 py-4 px-5 rounded-lg mb-6">
            <div className="flex items-center justify-between text-on-surface-variant mb-3">
              <span className="font-body text-[11px] uppercase tracking-wider">
                Show of Hands
              </span>
              <span className="font-body text-xs font-mono text-on-surface">
                {yesCount} of {snapshotCount} agreed
              </span>
            </div>

            {/* Visual Dot Array */}
            <div className="flex items-center justify-center gap-2 py-1 flex-wrap">
              {Array.from({ length: yesCount }).map((_, i) => (
                <span key={`yes-${i}`} className="w-3 h-3 rounded-full bg-on-tertiary-container" title="Yes" />
              ))}
              {Array.from({ length: noCount }).map((_, i) => (
                <span key={`no-${i}`} className="w-3 h-3 rounded-full bg-secondary-fixed-dim" title="Pass" />
              ))}
              {Array.from({ length: Math.min(10, awaitingCount) }).map((_, i) => (
                <span key={`await-${i}`} className="w-3 h-3 rounded-full bg-surface-container-high" title="Awaiting" />
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-on-surface-variant text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
                <span>{yesCount} yes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim" />
                <span>{noCount} pass</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-surface-container-high" />
                <span>{awaitingCount} awaiting</span>
              </div>
            </div>
          </div>

          {/* Voting or Execution Actions */}
          {currentProposal.statusCode === 0 ? (
            <div>
              {cantVote ? (
                <p className="font-body text-xs text-outline mb-2">{cantVote}</p>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => handleVote(true)}
                    disabled={isLoading}
                    className="w-full sm:w-1/2 py-2.5 px-4 rounded-full bg-primary text-surface font-body text-xs tracking-wider uppercase transition-colors hover:bg-primary-container active:scale-95"
                  >
                    Raise hand (Yes)
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    disabled={isLoading}
                    className="w-full sm:w-1/2 py-2.5 px-4 rounded-full bg-surface-container text-primary font-body text-xs tracking-wider uppercase transition-colors hover:bg-surface-container-high active:scale-95"
                  >
                    Pass (No)
                  </button>
                </div>
              )}
            </div>
          ) : currentProposal.statusCode === 1 ? (
            <button
              onClick={handleExecute}
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-secondary text-surface font-body text-xs uppercase tracking-wider hover:bg-opacity-90 active:scale-95 shadow-sm"
            >
              {isLoading ? "Releasing funds..." : "Release funds (Consensus Reached)"}
            </button>
          ) : (
            <div className="py-2 text-xs font-mono text-outline uppercase">
              Proposal {currentProposal.statusText}
            </div>
          )}
        </div>
      )}

      {/* Archive / Past Requests Modal Toggle */}
      {proposals.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchive(true)}
            className="font-body text-xs uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4 decoration-outline-variant"
          >
            See all requests ({proposals.length} total)
          </button>
        </div>
      )}

      {/* Past Requests Modal */}
      {showArchive && (
        <div className="fixed inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-[460px] w-full p-6 sm:p-8 rounded-xl shadow-lg border border-outline-variant/30 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
              <div>
                <span className="font-body text-[10px] uppercase tracking-wider text-secondary">
                  Archive
                </span>
                <h2 className="font-headline text-xl text-primary mt-0.5">
                  All Collective Requests
                </h2>
              </div>
              <button
                onClick={() => setShowArchive(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                    setShowArchive(false);
                  }}
                  className="p-3.5 rounded-lg bg-surface-container-low transition-colors hover:bg-surface-container flex items-center justify-between cursor-pointer text-left"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-body text-xs text-primary font-medium truncate">
                      #{p.id} {p.purpose}
                    </p>
                    <p className="font-body text-[10px] text-on-surface-variant mt-0.5">
                      Yes: {p.yesVotes.toString()} • No: {p.noVotes.toString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono text-xs text-primary block">
                      {ethers.formatEther(p.amount)} ETH
                    </span>
                    <span
                      className={`font-body text-[10px] uppercase tracking-wider mt-0.5 block ${
                        p.statusText === "PASSED" || p.statusText === "EXECUTED"
                          ? "text-on-tertiary-container font-semibold"
                          : "text-outline"
                      }`}
                    >
                      {p.statusText}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-2 text-center">
              <button
                onClick={() => setShowArchive(false)}
                className="w-full py-2 rounded-full bg-surface-container text-primary font-body text-xs uppercase tracking-wider hover:bg-surface-container-high transition-colors"
              >
                Return to card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
