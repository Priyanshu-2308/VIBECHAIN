import React from "react";

export default function Header({ account, isConnecting, onConnect, isMember }) {
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30">
      <div className="h-16 max-w-[580px] mx-auto px-6 flex items-center justify-between">
        {/* Emblem & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-surface shadow-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9 C6 5 18 5 18 9 L18 17 C18 20 15 21 12 21 C9 21 6 20 6 17 Z" />
              <path d="M5 8 L19 8" />
            </svg>
          </div>
          <span className="font-headline text-lg tracking-tight text-primary font-medium select-none">
            The Common Pot
          </span>
        </div>

        {/* Wallet Pill Button */}
        <div className="flex items-center">
          {account ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 hover:bg-surface-container transition-colors">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMember ? "bg-on-tertiary-container" : "bg-secondary-container"
                }`}
                title={isMember ? "Active table member" : "Public observer"}
              />
              <span className="font-mono text-xs text-on-surface-variant font-medium">
                {formatAddress(account)}
              </span>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="px-4 py-1.5 rounded-full bg-primary text-surface font-body text-xs font-medium tracking-wide hover:bg-primary-container active:scale-95 transition-all shadow-sm"
            >
              {isConnecting ? "Connecting..." : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
