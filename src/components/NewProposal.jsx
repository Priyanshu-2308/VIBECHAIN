import React, { useState } from "react";
import { ethers } from "ethers";
import { getSignerContract, checkAndSwitchNetwork } from "../utils/ethereum.js";

export default function NewProposal({
  account,
  isMember,
  treasuryBalance,
  onRefresh,
  onConnect,
  onProposalCreated,
}) {
  const [amountEth, setAmountEth] = useState("0.01");
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const maxAllowedSpend = parseFloat(treasuryBalance) * 0.5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) return onConnect();
    if (!isMember) {
      return setMsg("Only members at the table can submit requests. Join first.");
    }

    if (!ethers.isAddress(recipient)) {
      return setMsg("Please provide a valid Ethereum recipient address.");
    }

    const amt = parseFloat(amountEth);
    if (isNaN(amt) || amt <= 0) {
      return setMsg("Amount must be greater than 0 ETH.");
    }

    if (amt > maxAllowedSpend) {
      return setMsg(
        `Amount (${amt} ETH) exceeds 50% max spend ceiling (${maxAllowedSpend.toFixed(4)} ETH).`
      );
    }

    const purposeBytes = new TextEncoder().encode(purpose).length;
    if (purposeBytes === 0 || purposeBytes > 200) {
      return setMsg("Purpose must be between 1 and 200 bytes.");
    }

    try {
      setIsLoading(true);
      setMsg("Placing your request before the circle...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const amountWei = ethers.parseEther(amountEth);
      const tx = await contract.propose(recipient, amountWei, purpose);

      setMsg(`Request broadcast: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setMsg("Request is now open on the table for voting.");
      setPurpose("");
      setRecipient("");
      await onRefresh();
      if (onProposalCreated) onProposalCreated();
    } catch (err) {
      console.error(err);
      setMsg(`Request Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const purposeBytes = new TextEncoder().encode(purpose).length;

  return (
    <div className="w-full flex flex-col items-center justify-center py-6">
      <div className="w-full max-w-[460px] bg-surface-container-lowest p-8 sm:p-10 rounded-xl shadow-sm border border-outline-variant/30">
        <div className="text-center mb-6">
          <span className="font-body text-[11px] uppercase tracking-wider text-secondary block mb-1">
            New Community Request
          </span>
          <h1 className="font-headline text-2xl text-primary font-normal">
            What does the collective need?
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1">
            Every request is brought before the full circle. Max 50% cap enforced.
          </p>
        </div>

        {!isMember && (
          <div className="mb-4 p-3 rounded-lg bg-surface-container text-primary font-body text-xs text-center">
            You are currently an observer. Please pledge 0.001 ETH at the Pot to join the table before submitting.
          </div>
        )}

        {msg && (
          <div className="mb-4 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-primary font-body text-xs flex items-center justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg("")} className="font-bold underline ml-2">
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount Field */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline text-xs text-on-surface-variant">
              <label>Amount in ETH</label>
              <span className="text-[11px] text-outline font-mono">
                Cap: {maxAllowedSpend.toFixed(4)} ETH
              </span>
            </div>
            <div className="flex items-center border border-outline-variant/50 rounded-lg p-2.5 bg-surface">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                className="bg-transparent font-display text-xl w-full outline-none text-primary"
              />
              <span className="text-xs font-mono text-outline select-none ml-2">ETH</span>
            </div>
          </div>

          {/* Purpose Field */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline text-xs text-on-surface-variant">
              <label>Purpose / Description</label>
              <span className="text-[10px] text-outline">{purposeBytes}/200 bytes</span>
            </div>
            <textarea
              required
              rows={3}
              placeholder="e.g. Workshop materials, audio gear refill, community library books..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full p-2.5 border border-outline-variant/50 rounded-lg bg-surface font-body text-xs text-primary outline-none focus:border-secondary transition-colors resize-none"
            />
          </div>

          {/* Recipient Address Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-on-surface-variant">Recipient ETH Address</label>
            <input
              type="text"
              required
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              className="w-full p-2.5 border border-outline-variant/50 rounded-lg bg-surface font-mono text-xs text-primary outline-none focus:border-secondary transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isMember || isLoading || purposeBytes === 0 || purposeBytes > 200}
            className={`w-full py-3 rounded-full font-body text-xs uppercase tracking-wider transition-all mt-2 ${
              !isMember || isLoading || purposeBytes === 0 || purposeBytes > 200
                ? "bg-surface-container text-outline cursor-not-allowed"
                : "bg-primary text-surface hover:bg-primary-container active:scale-95 shadow-sm"
            }`}
          >
            {isLoading ? "Broadcasting request..." : "Place on the table"}
          </button>
        </form>
      </div>
    </div>
  );
}
