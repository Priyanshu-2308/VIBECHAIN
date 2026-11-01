import React, { useState } from "react";
import { ethers } from "ethers";
import PotJarVisual from "./PotJarVisual.jsx";
import contractData from "../contract.json";
import { getSignerContract, checkAndSwitchNetwork } from "../utils/ethereum.js";

export default function Dashboard({
  treasuryBalance,
  memberCount,
  proposalCount,
  account,
  isMember,
  onConnect,
  onRefresh,
  onNavigate,
}) {
  const [showCharter, setShowCharter] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [contribAmount, setContribAmount] = useState("0.01");
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const contractAddress = contractData.address || "";
  const etherscanUrl = contractAddress
    ? `https://sepolia.etherscan.io/address/${contractAddress}`
    : "https://sepolia.etherscan.io";

  const handleJoin = async () => {
    if (!account) return onConnect();
    try {
      setIsLoading(true);
      setMsg("Requesting membership pledge...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const fee = ethers.parseEther("0.001");
      const tx = await contract.join({ value: fee });
      setMsg(`Pledge submitted: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setMsg("Welcome to the table! You are now an active member.");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setMsg(`Pledge Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!account) return onConnect();
    if (!contribAmount || parseFloat(contribAmount) <= 0) return;

    try {
      setIsLoading(true);
      setMsg("Routing gift to the pot...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.contribute({
        value: ethers.parseEther(contribAmount),
      });
      setMsg(`Gift sent: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setMsg("The pot has been replenished gently.");
      setShowContribute(false);
      await onRefresh();
    } catch (err) {
      console.error(err);
      setMsg(`Contribution Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!account) return onConnect();
    const confirmed = window.confirm(
      "Departure from table: This will gently revoke your voting rights. The 0.001 ETH pledge remains in the pot for collective care."
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      setMsg("Registering departure...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.leave();
      setMsg(`Departure transaction: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setMsg("You have stepped away from the table.");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setMsg(`Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-auto py-8 relative">
      {/* Visual Glass Pot with Amber Animated Wave */}
      <PotJarVisual balanceEth={treasuryBalance} />

      {/* Primary Balance Display in Literata */}
      <div className="text-center mb-2">
        <h1 className="font-display text-4xl sm:text-5xl text-primary tracking-tight font-light select-none">
          {treasuryBalance}{" "}
          <span className="text-xl sm:text-2xl font-display text-on-surface-variant font-normal ml-0.5">
            ETH
          </span>
        </h1>
        <p className="font-body text-xs text-outline tracking-wider mt-1 select-none">
          COMMUNAL TREASURY RESERVE
        </p>
      </div>

      {/* Exactly ONE Short Line of Context */}
      <p className="font-body text-sm text-on-surface-variant text-center max-w-[320px] mb-6 font-normal">
        Nobody holds it. Everybody can see it.
      </p>

      {/* Status Toast */}
      {msg && (
        <div className="w-full max-w-[380px] mb-4 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-primary font-body text-xs flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="font-bold underline ml-2">
            ×
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
        {!account ? (
          <button
            onClick={onConnect}
            className="w-full h-10 px-8 rounded-full bg-primary text-surface font-body text-xs uppercase tracking-wider transition-all duration-200 hover:bg-primary-container active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Connect wallet</span>
          </button>
        ) : !isMember ? (
          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full h-10 px-8 rounded-full bg-primary text-surface font-body text-xs uppercase tracking-wider transition-all duration-200 hover:bg-primary-container active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{isLoading ? "Broadcasting..." : "Join table (Pledge 0.001 ETH)"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => setShowContribute(!showContribute)}
              className="flex-1 h-10 px-4 rounded-full bg-primary text-surface font-body text-xs uppercase tracking-wider transition-all hover:bg-primary-container flex items-center justify-center"
            >
              Add to pot
            </button>
            <button
              onClick={() => onNavigate("requests")}
              className="flex-1 h-10 px-4 rounded-full bg-surface-container border border-outline-variant/40 text-primary font-body text-xs uppercase tracking-wider hover:bg-surface-container-high flex items-center justify-center"
            >
              View requests
            </button>
          </div>
        )}

        {/* Quiet Subordinate Trigger: How it works */}
        <button
          onClick={() => setShowCharter(true)}
          className="font-body text-xs uppercase tracking-wider text-outline hover:text-primary transition-colors underline decoration-outline-variant underline-offset-4 mt-2"
        >
          How it works
        </button>

        {isMember && (
          <button
            onClick={handleLeave}
            disabled={isLoading}
            className="text-[11px] text-outline hover:text-error transition-colors mt-1"
          >
            Step away from table (Leave)
          </button>
        )}
      </div>

      {/* Contribute Form Drawer */}
      {showContribute && (
        <form
          onSubmit={handleContribute}
          className="w-full max-w-[340px] mt-6 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-3 shadow-sm animate-fadeIn"
        >
          <div className="flex justify-between items-center text-xs text-on-surface-variant">
            <span>Gift to the communal pot</span>
            <button type="button" onClick={() => setShowContribute(false)}>
              ×
            </button>
          </div>
          <div className="flex items-center gap-2 border border-outline-variant/50 rounded-lg p-2 bg-surface">
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={contribAmount}
              onChange={(e) => setContribAmount(e.target.value)}
              className="bg-transparent font-display text-lg w-full outline-none"
            />
            <span className="text-xs font-mono text-outline">ETH</span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-full bg-primary text-surface font-body text-xs uppercase tracking-wider"
          >
            {isLoading ? "Sending..." : "Confirm Gift"}
          </button>
        </form>
      )}

      {/* Quiet stats footer strip */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 font-body text-xs text-on-surface-variant">
        <span>{memberCount} at the table</span>
        <span>•</span>
        <span>{proposalCount} collective decisions</span>
        <span>•</span>
        <a
          href={etherscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary hover:underline flex items-center gap-0.5"
        >
          <span>Contract</span>
          <span className="text-[10px]">↗</span>
        </a>
      </div>

      {/* Calm Charter Modal */}
      {showCharter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-md border border-outline-variant/30">
            {/* Modal Header */}
            <div className="flex items-baseline justify-between mb-6 pb-3 bg-surface-container-low px-4 py-3 rounded-lg">
              <div>
                <span className="font-body text-[10px] uppercase text-on-surface-variant tracking-wider block">
                  Charter
                </span>
                <span className="font-headline text-xl text-primary font-normal">
                  The Common Pot
                </span>
              </div>
              <button
                onClick={() => setShowCharter(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* 4 Collective Domestic Rules */}
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <span className="font-body text-xs text-outline mt-0.5 w-4">01</span>
                <div>
                  <h4 className="font-body text-xs text-primary font-medium">Membership pledge</h4>
                  <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                    0.001 ETH one-time pledge to sit at the shared table. Stays in the pot.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-body text-xs text-outline mt-0.5 w-4">02</span>
                <div>
                  <h4 className="font-body text-xs text-primary font-medium">Voting window</h4>
                  <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                    300 quiet seconds (5 minutes) for members to reflect and consider.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-body text-xs text-outline mt-0.5 w-4">03</span>
                <div>
                  <h4 className="font-body text-xs text-primary font-medium">Consensus</h4>
                  <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                    50% of registered snapshot members must softly raise a hand.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-body text-xs text-outline mt-0.5 w-4">04</span>
                <div>
                  <h4 className="font-body text-xs text-primary font-medium">Maximum per request</h4>
                  <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                    Capped at 50% to ensure the reserve remains evergreen.
                  </p>
                </div>
              </div>
            </div>

            {/* Close button */}
            <div className="mt-6 pt-2 flex justify-center">
              <button
                onClick={() => setShowCharter(false)}
                className="font-body text-xs uppercase tracking-wider text-secondary hover:text-primary transition-colors py-1.5 px-4 rounded-full"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
