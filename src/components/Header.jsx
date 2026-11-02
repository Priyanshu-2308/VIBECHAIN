import React from "react";

export default function Header({ account, balance, isConnecting, onConnect, isMember }) {
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface border-b border-surface-variant">
      <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <span className="font-headline text-2xl uppercase tracking-wider text-ink select-none">
            TREASURY
          </span>
          <span className="font-mono text-xs text-on-surface-variant uppercase hidden xs:inline">
            // ETH-VAULT
          </span>
        </div>

        {/* Status & Wallet Pill Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {account && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-container border border-surface-variant font-mono text-xs uppercase">
              <span className="text-tertiary">VAULT STATUS:</span>
              <span className={isMember ? "text-secondary font-bold" : "text-primary font-bold"}>
                {isMember ? "MEMBER" : "OBSERVER"}
              </span>
            </div>
          )}

          {/* Wallet Connection Pill: 2px Ink border, Bone ground, 8px square */}
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="h-10 px-4 rounded-pill border-2 border-ink bg-surface flex items-center gap-2 select-none hover:bg-surface-container active:bg-surface-variant transition-colors"
            title={account || "Connect Ethereum Sepolia Wallet"}
          >
            {/* Geometric 8px Square Indicator */}
            <span
              className={`w-2 h-2 flex-shrink-0 transition-colors ${
                account ? "bg-secondary" : "bg-primary animate-pulse"
              }`}
            />
            <span className="font-mono text-xs text-ink uppercase tracking-wider font-semibold">
              {isConnecting
                ? "SYNCING..."
                : account
                ? formatAddress(account)
                : "CONNECT WALLET"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

