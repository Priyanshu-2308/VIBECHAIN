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
  const [recipient, setRecipient] = useState("");
  const [amountEth, setAmountEth] = useState("0.01");
  const [purpose, setPurpose] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const maxAllowedSpend = parseFloat(treasuryBalance) * 0.5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) return onConnect();
    if (!isMember) {
      return setStatusMsg("Only active members can submit proposals. Join the club first.");
    }

    if (!ethers.isAddress(recipient)) {
      return setStatusMsg("Invalid recipient Ethereum address.");
    }

    const amt = parseFloat(amountEth);
    if (isNaN(amt) || amt <= 0) {
      return setStatusMsg("Amount must be greater than 0 ETH.");
    }

    if (amt > maxAllowedSpend) {
      return setStatusMsg(
        `Amount (${amt} ETH) exceeds 50% max spend ceiling (${maxAllowedSpend.toFixed(4)} ETH).`
      );
    }

    const purposeBytes = new TextEncoder().encode(purpose).length;
    if (purposeBytes === 0 || purposeBytes > 200) {
      return setStatusMsg("Purpose must be between 1 and 200 bytes.");
    }

    try {
      setIsLoading(true);
      setStatusMsg("Switching network and requesting proposal signature...");
      await checkAndSwitchNetwork();

      const contract = await getSignerContract();
      const amountWei = ethers.parseEther(amountEth);
      const tx = await contract.propose(recipient, amountWei, purpose);

      setStatusMsg(`Broadcasting proposal transaction: ${tx.hash.slice(0, 10)}...`);
      await tx.wait(1);

      setStatusMsg("PROPOSAL REGISTERED ON-CHAIN! Consensus voting has commenced.");
      setPurpose("");
      setRecipient("");
      await onRefresh();
      if (onProposalCreated) onProposalCreated();
    } catch (err) {
      console.error(err);
      setStatusMsg(`Proposal Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const purposeLen = new TextEncoder().encode(purpose).length;

  return (
    <div className="flex flex-col w-full pb-24 md:pb-12 bg-surface text-ink">
      <div className="max-w-2xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b-2 border-ink pb-4">
          <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
            NEW ALLOCATION REQUISITION
          </span>
          <h1 className="font-headline text-3xl md:text-4xl uppercase tracking-tight m-0">
            DISPATCH PROPOSAL
          </h1>
          <p className="font-mono text-xs text-on-surface-variant uppercase">
            COMMUNITY-VOTED CAPITAL OUTFLOWS // 50% SPEND CEILING ENFORCED
          </p>
        </div>

        {/* Member warning if not joined */}
        {!isMember && (
          <div className="p-4 bg-primary/10 border-2 border-primary font-mono text-xs text-ink uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">warning</span>
            <span>
              YOU ARE CURRENTLY AN OBSERVER. ONLY JOINED MEMBERS CAN DISPATCH
              PROPOSALS.
            </span>
          </div>
        )}

        {statusMsg && (
          <div className="p-4 bg-ink text-white border-2 border-ink font-mono text-xs uppercase flex items-center justify-between">
            <span>{statusMsg}</span>
            <button
              onClick={() => setStatusMsg("")}
              className="text-primary font-bold ml-2 underline"
            >
              DISMISS
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Recipient Address */}
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
              RECIPIENT ADDRESS [PAYABLE ETH ADDRESS]
            </label>
            <input
              type="text"
              required
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              className="w-full h-12 px-3 bg-surface border-2 border-ink font-mono text-xs text-ink outline-none focus:border-secondary transition-none"
            />
            <span className="font-mono text-[10px] text-tertiary">
              Reverts if 0x0 or treasury self-address.
            </span>
          </div>

          {/* Amount in ETH */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <label className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
                REQUESTED AMOUNT [ETH]
              </label>
              <span className="font-mono text-[11px] text-primary font-bold">
                MAX 50%: {maxAllowedSpend.toFixed(4)} ETH
              </span>
            </div>
            <div className="flex items-center border-2 border-ink bg-surface h-12 px-3">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                className="w-full bg-transparent font-headline text-xl text-ink outline-none"
              />
              <span className="font-headline text-xl text-ink select-none ml-2">
                ETH
              </span>
            </div>
          </div>

          {/* Purpose / Reason */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <label className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
                ALLOCATION PURPOSE / OBJECTIVE
              </label>
              <span
                className={`font-mono text-[11px] font-bold ${
                  purposeLen > 200 ? "text-primary" : "text-tertiary"
                }`}
              >
                {purposeLen} / 200 BYTES
              </span>
            </div>
            <textarea
              required
              rows={3}
              placeholder="State clear objective (e.g., Q2 Smart Contract Security Audit by OpenZeppelin)..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full p-3 bg-surface border-2 border-ink font-body text-sm text-ink outline-none focus:border-secondary transition-none resize-none"
            />
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={!isMember || isLoading || purposeLen === 0 || purposeLen > 200}
            className={`w-full h-14 font-headline text-xl uppercase tracking-wider flex items-center justify-center border-2 border-ink transition-none ${
              !isMember || isLoading || purposeLen === 0 || purposeLen > 200
                ? "bg-surface-variant text-gray-500 cursor-not-allowed opacity-50"
                : "bg-primary text-white hover:bg-primary-dark cursor-pointer active:bg-ink"
            }`}
          >
            {isLoading ? "BROADCASTING PROPOSAL..." : "SUBMIT PROPOSAL TO VOTING"}
          </button>
        </form>
      </div>
    </div>
  );
}

