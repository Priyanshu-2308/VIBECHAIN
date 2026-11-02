import React from "react";
import { ethers } from "ethers";
import contractData from "../contract.json";

export default function Ledger({
  events = [],
  parameters = {},
  isLoadingEvents,
  isLoadingOlderHistory = false,
  onRefresh,
}) {
  const maxSpendPct = parameters.maxSpendBps ? parameters.maxSpendBps / 100 : 50;
  const quorumPct = parameters.quorumBps ? parameters.quorumBps / 100 : 50;
  const getBadgeStyle = (name) => {
    switch (name) {
      case "Executed":
        return "bg-secondary text-white border-secondary";
      case "ProposalCreated":
        return "bg-primary text-white border-primary";
      case "Joined":
        return "bg-ink text-white border-ink";
      case "Voted":
        return "bg-surface-variant text-ink border-ink";
      case "Contributed":
        return "bg-amber-600 text-white border-amber-600";
      case "Left":
        return "bg-gray-400 text-ink border-gray-500";
      default:
        return "bg-surface text-ink border-ink";
    }
  };

  return (
    <div className="flex flex-col w-full pb-24 md:pb-12 bg-surface text-ink">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b-2 border-ink pb-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
              PUBLIC TRANSPARENCY REGISTRY
            </span>
            <button
              onClick={onRefresh}
              className="font-mono text-xs text-secondary hover:underline uppercase font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              REFRESH FEED
            </button>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl uppercase tracking-tight m-0">
            ON-CHAIN AUDIT LOG
          </h1>
          <p className="font-mono text-xs text-on-surface-variant uppercase">
            IMMUTABLE CHRONICLE OF EVERY INFLOW, VOTE, AND OUTFLOW
          </p>
        </div>

        {/* Explainability Callout for Judges */}
        <div className="p-4 bg-surface-container border-2 border-ink flex flex-col gap-2">
          <div className="font-headline text-lg uppercase text-ink">
            WHAT ANYONE CAN PUBLICLY VERIFY
          </div>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed m-0">
            In VIBECHAIN, every treasury outflow requires an immutable chain of custody:
            a member must create a proposal with a stated purpose (max {maxSpendPct}% cap), eligible
            members must vote reaching a {quorumPct}% quorum, and funds leave only via the
            tamper-proof <code>execute()</code> function emitting the exact recipient,
            amount, and purpose on Ethereum Sepolia.
          </p>
        </div>

        {/* Loading Older History Banner */}
        {isLoadingOlderHistory && (
          <div className="p-3 bg-amber-500/10 border-2 border-amber-600 text-ink flex items-center gap-3 font-mono text-xs uppercase animate-pulse">
            <span className="material-symbols-outlined text-amber-600 text-base">history</span>
            <span>
              Scanning historical blocks from deployment (deploy block to latest)... Older transactions are being indexed in background.
            </span>
          </div>
        )}

        {/* Events Feed */}
        <div className="flex flex-col border-2 border-ink divide-y-2 divide-ink bg-white">
          {isLoadingEvents ? (
            <div className="p-8 text-center font-mono text-sm uppercase text-gray-500">
              SYNCHRONIZING WITH SEPOLIA RPC...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center font-mono text-sm uppercase text-gray-500">
              NO EVENTS DETECTED YET. ALL TRANSACTIONS WILL STREAM HERE LIVE.
            </div>
          ) : (
            events.map((evt, idx) => (
              <div key={`${evt.txHash}-${idx}`} className="p-4 flex flex-col gap-2 hover:bg-surface-container/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 border ${getBadgeStyle(
                        evt.name
                      )}`}
                    >
                      {evt.name}
                    </span>
                    <span className="font-mono text-xs text-ink font-bold">
                      BLOCK #{evt.blockNumber}
                    </span>
                  </div>

                  <a
                    href={`https://sepolia.etherscan.io/tx/${evt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-secondary hover:underline uppercase flex items-center gap-1 font-bold"
                  >
                    <span>TX: {evt.txHash.slice(0, 10)}...</span>
                    <span>↗</span>
                  </a>
                </div>

                <div className="font-mono text-xs text-ink/80 flex flex-col gap-1 bg-surface-container/40 p-2 border border-surface-variant">
                  {evt.details}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

