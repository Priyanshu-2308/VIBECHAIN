import React from "react";
import ThreeMonolith from "./ThreeMonolith.jsx";
import contractData from "../contract.json";

export default function Dashboard({
  treasuryBalance,
  memberCount,
  proposalCount,
  account,
  onConnect,
  onNavigate,
}) {
  const contractAddress = contractData.address || "0xDeployingSoon...";
  const etherscanUrl = contractData.address
    ? `https://sepolia.etherscan.io/address/${contractData.address}`
    : "https://sepolia.etherscan.io";

  return (
    <div className="flex flex-col w-full pb-24 md:pb-12">
      {/* 3D Wireframe Monolith Hero Viewport */}
      <div className="w-full px-4 py-3 bg-surface">
        <ThreeMonolith variant="01" height="h-48 md:h-64" color={0x141414} />
      </div>

      {/* Brutalist Rules Banner */}
      <div className="w-full bg-surface px-4 py-3 border-y border-surface-variant flex flex-col gap-0.5">
        <div className="font-headline text-xl md:text-2xl text-ink uppercase tracking-wider">
          NO OWNER. NO ADMIN. RULES ONLY.
        </div>
        <div className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">
          SELF-EXECUTING ON-CHAIN BYLAWS // AUTONOMOUS TREASURY
        </div>
      </div>

      {/* Core Live Metrics */}
      <div className="w-full bg-surface p-4 grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-variant border-b border-surface-variant">
        <div className="flex flex-col bg-surface p-4 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            TREASURY RESERVE
          </span>
          <span className="font-headline text-3xl md:text-4xl text-ink uppercase my-2">
            {treasuryBalance} ETH
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            IMMUTABLE ESCROW
          </span>
        </div>

        <div className="flex flex-col bg-surface p-4 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            CONSENSUS SHARE
          </span>
          <span className="font-headline text-3xl md:text-4xl text-ink uppercase my-2">
            {memberCount} MEMBERS
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            1 MEMBER = 1 VOTE
          </span>
        </div>

        <div className="flex flex-col bg-surface p-4 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            DISPATCH REGISTRY
          </span>
          <span className="font-headline text-3xl md:text-4xl text-ink uppercase my-2">
            {proposalCount} PROPOSALS
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            ON-CHAIN DECISIONS
          </span>
        </div>
      </div>

      {/* Immutable 4-Parameter Governance Matrix */}
      <div className="w-full bg-surface p-4 grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-variant border-b border-surface-variant">
        <div className="flex flex-col bg-surface p-3 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            PARAM 01 // JOIN
          </span>
          <span className="font-headline text-xl md:text-2xl text-ink uppercase my-1">
            0.001 ETH
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            JOIN FEE
          </span>
        </div>

        <div className="flex flex-col bg-surface p-3 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            PARAM 02 // TIME
          </span>
          <span className="font-headline text-xl md:text-2xl text-ink uppercase my-1">
            300S (5M)
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            VOTING WINDOW
          </span>
        </div>

        <div className="flex flex-col bg-surface p-3 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            PARAM 03 // QUORUM
          </span>
          <span className="font-headline text-xl md:text-2xl text-ink uppercase my-1">
            50%
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            MIN FLOOR
          </span>
        </div>

        <div className="flex flex-col bg-surface p-3 justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            PARAM 04 // LIMIT
          </span>
          <span className="font-headline text-xl md:text-2xl text-ink uppercase my-1">
            50%
          </span>
          <span className="font-mono text-[11px] text-tertiary uppercase">
            MAX SPEND CAP
          </span>
        </div>
      </div>

      {/* Contract Router & Etherscan Verification Bar */}
      <div className="w-full bg-surface px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-surface-variant">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-on-surface-variant uppercase">
            CONTRACT:
          </span>
          <span className="font-mono text-xs text-ink uppercase select-all tracking-wider font-bold">
            {contractAddress}
          </span>
        </div>

        <a
          href={etherscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-2 border-ink hover:border-secondary hover:text-secondary text-ink px-3 py-1 font-mono text-xs uppercase font-bold transition-none flex items-center gap-1"
        >
          <span>VIEW ETHERSCAN</span>
          <span className="text-xs">↗</span>
        </a>
      </div>

      {/* Action CTA Block */}
      <div className="w-full bg-surface p-4 flex flex-col sm:flex-row gap-3">
        {!account ? (
          <button
            onClick={onConnect}
            className="w-full h-14 bg-secondary text-white hover:bg-secondary-dark font-headline text-xl uppercase tracking-wider flex items-center justify-between px-6 transition-none border-2 border-ink"
          >
            <span>CONNECT WALLET</span>
            <span className="font-mono text-xs opacity-90 uppercase">
              ETH SEPOLIA [0x]
            </span>
          </button>
        ) : (
          <>
            <button
              onClick={() => onNavigate("membership")}
              className="flex-1 h-14 bg-primary text-white hover:bg-primary-dark font-headline text-xl uppercase tracking-wider flex items-center justify-center transition-none border-2 border-ink"
            >
              MEMBERSHIP DESK
            </button>
            <button
              onClick={() => onNavigate("proposals")}
              className="flex-1 h-14 bg-surface text-ink hover:bg-ink hover:text-white font-headline text-xl uppercase tracking-wider flex items-center justify-center transition-none border-2 border-ink"
            >
              EXPLORE PROPOSALS
            </button>
          </>
        )}
      </div>
    </div>
  );
}

