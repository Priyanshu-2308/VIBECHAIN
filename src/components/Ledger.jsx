import React from "react";
import { ethers } from "ethers";

export default function Ledger({ events = [], isLoadingEvents, onRefresh }) {
  const getEventBadge = (name) => {
    switch (name) {
      case "Executed":
        return { label: "Settled", color: "bg-on-tertiary-container" };
      case "ProposalCreated":
        return { label: "Requested", color: "bg-secondary-container" };
      case "Joined":
        return { label: "Pledge (Join)", color: "bg-primary" };
      case "Voted":
        return { label: "Show of Hands", color: "bg-surface-container-high" };
      case "Contributed":
        return { label: "Gift (Inflow)", color: "bg-secondary" };
      case "Left":
        return { label: "Departure", color: "bg-outline" };
      default:
        return { label: name, color: "bg-outline-variant" };
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-[500px] bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
          <div>
            <span className="font-body text-[10px] uppercase tracking-wider text-secondary block">
              Transparency
            </span>
            <h1 className="font-headline text-2xl text-primary font-normal">
              The Notebook
            </h1>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs text-secondary hover:underline flex items-center gap-1 font-body"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Sync
          </button>
        </div>

        <p className="font-body text-xs text-on-surface-variant mb-6 leading-relaxed">
          A permanent, public chronicle of every coin placed in the pot, every raised hand, and every settled expenditure.
        </p>

        <div className="space-y-3">
          {isLoadingEvents ? (
            <div className="py-8 text-center font-body text-xs text-outline">
              Leafing through pages on Sepolia...
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center font-body text-xs text-outline">
              The notebook is clean. New events will appear here automatically.
            </div>
          ) : (
            events.map((evt, idx) => {
              const badge = getEventBadge(evt.name);
              return (
                <div
                  key={`${evt.txHash}-${idx}`}
                  className="p-3.5 rounded-lg bg-surface-container-low/70 border border-outline-variant/30 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${badge.color}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-xs font-medium text-primary">
                          {badge.label}
                        </span>
                        <span className="font-mono text-[10px] text-outline">
                          Block #{evt.blockNumber}
                        </span>
                      </div>
                      <p className="font-body text-[11px] text-on-surface-variant mt-0.5 break-words">
                        {evt.details}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`https://sepolia.etherscan.io/tx/${evt.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-secondary hover:underline flex-shrink-0 mt-0.5"
                  >
                    TX ↗
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
