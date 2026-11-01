import React, { useState } from "react";
import { ethers } from "ethers";
import ThreeMonolith from "./ThreeMonolith.jsx";
import { getSignerContract, checkAndSwitchNetwork } from "../utils/ethereum.js";

export default function Membership({
  account,
  isMember,
  treasuryBalance,
  onRefresh,
  onConnect,
}) {
  const [joinFeeEth, setJoinFeeEth] = useState("0.001");
  const [contribAmount, setContribAmount] = useState("0.01");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleJoin = async () => {
    if (!account) return onConnect();
    try {
      setIsLoading(true);
      setStatusMsg("Switching to Sepolia & Requesting Signature...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.join({ value: ethers.parseEther(joinFeeEth) });
      setStatusMsg(`Broadcasting join transaction: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setStatusMsg("STAKE COMMITTED: Membership Active!");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setStatusMsg(`Join Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!account) return onConnect();
    if (!contribAmount || parseFloat(contribAmount) <= 0) {
      return setStatusMsg("Invalid contribution amount");
    }

    try {
      setIsLoading(true);
      setStatusMsg("Routing contribution...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.contribute({
        value: ethers.parseEther(contribAmount),
      });
      setStatusMsg(`Broadcasting donation: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setStatusMsg("CONFIRMED: Treasury Capital Incremented!");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setStatusMsg(`Contribution Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!account) return onConnect();
    const confirmed = window.confirm(
      "CONFIRM DEFECTION: This will revoke your voting privileges. Note: Membership fee remains locked in the treasury to protect collective liquidity."
    );
    if (!confirmed) return;

    try {
      setIsLoading(true);
      setStatusMsg("Executing defector departure...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const tx = await contract.leave();
      setStatusMsg(`Departure tx sent: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setStatusMsg("LEFT CLUB: Status revoked.");
      await onRefresh();
    } catch (err) {
      console.error(err);
      setStatusMsg(`Leave Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-24 md:pb-12 bg-primary text-white">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        {/* Monolith 03 3D Viewport */}
        <div className="w-full bg-ink text-white p-2 border-2 border-ink">
          <ThreeMonolith variant="03" height="h-44 md:h-56" color={0xff4d1c} />
        </div>

        {/* Member Stake Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-widest text-white/80">
              PROTOCOL REGISTRY
            </span>
            <div className="bg-ink text-white px-3 py-1 font-mono text-xs uppercase tracking-wider border border-white/20">
              {isMember ? "ACTIVE VOTER // VERIFIED" : "PUBLIC OBSERVER"}
            </div>
          </div>
          <h1 className="font-headline text-4xl md:text-5xl uppercase tracking-tight leading-none m-0">
            MEMBER STAKE
          </h1>
          <p className="font-mono text-xs text-white/80 uppercase">
            CONSENSUS PARTICIPANT / IMMUTABLE ESCROW STATUS VERIFIED
          </p>
        </div>

        {/* Status notification toast */}
        {statusMsg && (
          <div className="p-3 bg-ink text-white border-2 border-white font-mono text-xs uppercase flex items-center justify-between">
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-primary font-bold hover:underline"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Join Block */}
        {!isMember ? (
          <div className="flex flex-col gap-3 bg-ink text-white p-6 border-2 border-white/20">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-xs text-tertiary-fixed uppercase">
                ENTRY REQUIREMENT
              </span>
              <span className="font-mono text-xs text-primary uppercase font-bold">
                1 WALLET = 1 VOTE
              </span>
            </div>
            <div className="font-headline text-3xl uppercase">
              FEE: {joinFeeEth} ETH
            </div>
            <p className="font-body text-xs text-gray-300">
              Deposit the exact required membership fee into the treasury contract.
              All funds stay inside the contract for collective allocation.
            </p>
            <button
              onClick={handleJoin}
              disabled={isLoading}
              className="w-full h-14 bg-white text-ink font-headline text-xl uppercase tracking-wider flex items-center justify-center hover:bg-surface-container active:bg-primary active:text-white transition-none border-2 border-ink"
            >
              {isLoading ? "BROADCASTING..." : "JOIN TREASURY"}
            </button>
          </div>
        ) : (
          <div className="bg-ink text-white p-6 border-2 border-white/20 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-secondary font-bold uppercase">
                MEMBERSHIP ACTIVE
              </span>
              <span className="font-mono text-xs text-white/60">
                GOVERNANCE PRIVILEGES GRANTED
              </span>
            </div>
            <div className="font-headline text-2xl uppercase">
              YOU ARE AN ON-CHAIN VOTER
            </div>
            <p className="font-body text-xs text-gray-300">
              You are eligible to vote on proposals created after your membership block.
            </p>
          </div>
        )}

        {/* Increment Capital Pool (Donate / Contribute) */}
        <div className="flex flex-col gap-2 bg-ink/40 p-5 border-2 border-white/20">
          <span className="font-mono text-xs uppercase tracking-widest text-white">
            INCREMENT CAPITAL POOL [ETH]
          </span>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="bg-white text-ink h-14 px-4 flex items-center justify-between flex-1 border-2 border-ink">
              <input
                type="number"
                min="0.001"
                step="0.005"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                className="bg-transparent font-headline text-2xl text-ink w-2/3 outline-none uppercase"
              />
              <span className="font-headline text-2xl text-ink select-none">
                ETH
              </span>
            </div>
            <button
              onClick={handleContribute}
              disabled={isLoading}
              className="h-14 px-8 bg-ink text-white font-headline text-xl uppercase tracking-wider flex items-center justify-center hover:bg-black active:bg-white active:text-ink transition-none border-2 border-white"
            >
              CONTRIBUTE
            </button>
          </div>
        </div>

        {/* Treasury Stats Breakdown */}
        <div className="flex flex-col gap-2 border-t border-white/20 pt-4 font-mono text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-white/80">TOTAL TREASURY POOL</span>
            <span className="text-white font-bold">{treasuryBalance} ETH</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-white/80">VOTING ALLOCATION CEILING (50%)</span>
            <span className="text-white font-bold">
              {(parseFloat(treasuryBalance) * 0.5).toFixed(4)} ETH
            </span>
          </div>
        </div>

        {/* Leave Club Section */}
        {isMember && (
          <div className="flex flex-col gap-3 pt-4 border-t border-white/20">
            <button
              onClick={handleLeave}
              disabled={isLoading}
              className="text-left font-headline text-xl text-white uppercase tracking-tight hover:underline flex items-center justify-between"
            >
              <span>LEAVE CLUB</span>
              <span className="material-symbols-outlined text-[24px]">
                arrow_forward
              </span>
            </button>

            <div className="bg-white text-primary p-3 flex items-start gap-2 font-mono text-[11px] uppercase leading-tight border-2 border-ink">
              <span className="material-symbols-outlined text-base flex-shrink-0">
                warning
              </span>
              <span>
                STAKE REFUND BURNS VOTING SHARE. UNREVOCABLE STATE TRANSITION
                TRIGGERED UPON SUBMISSION.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

