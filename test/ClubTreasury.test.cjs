const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ClubTreasury Contract Suite", function () {
  let ClubTreasury, treasury;
  let MaliciousRecipient, malicious;
  let deployer, alice, bob, charlie, dave, recipient, outsider;

  const MEMBERSHIP_FEE = ethers.parseEther("0.001");
  const VOTING_PERIOD = 300; // 300 seconds (5 min)
  const EXECUTION_WINDOW = 86400; // 24 hours
  const QUORUM_BPS = 5000; // 50%
  const MAX_SPEND_BPS = 5000; // 50%

  beforeEach(async function () {
    [deployer, alice, bob, charlie, dave, recipient, outsider] = await ethers.getSigners();

    ClubTreasury = await ethers.getContractFactory("ClubTreasury");
    treasury = await ClubTreasury.deploy(
      MEMBERSHIP_FEE,
      VOTING_PERIOD,
      EXECUTION_WINDOW,
      QUORUM_BPS,
      MAX_SPEND_BPS
    );
    await treasury.waitForDeployment();

    MaliciousRecipient = await ethers.getContractFactory("MaliciousRecipient");
    malicious = await MaliciousRecipient.deploy(await treasury.getAddress());
    await malicious.waitForDeployment();
  });

  describe("1. Constructor & Immutability", function () {
    it("deploys with correct immutable parameters", async function () {
      expect(await treasury.MEMBERSHIP_FEE()).to.equal(MEMBERSHIP_FEE);
      expect(await treasury.VOTING_PERIOD()).to.equal(VOTING_PERIOD);
      expect(await treasury.EXECUTION_WINDOW()).to.equal(EXECUTION_WINDOW);
      expect(await treasury.QUORUM_BPS()).to.equal(QUORUM_BPS);
      expect(await treasury.MAX_SPEND_BPS()).to.equal(MAX_SPEND_BPS);
      expect(await treasury.memberCount()).to.equal(0);
      expect(await treasury.proposalCount()).to.equal(0);
      expect(await treasury.treasuryBalance()).to.equal(0);
    });

    it("reverts on invalid constructor parameters", async function () {
      // Fee = 0
      await expect(
        ClubTreasury.deploy(0, VOTING_PERIOD, EXECUTION_WINDOW, QUORUM_BPS, MAX_SPEND_BPS)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");

      // Voting period < 60s
      await expect(
        ClubTreasury.deploy(MEMBERSHIP_FEE, 59, EXECUTION_WINDOW, QUORUM_BPS, MAX_SPEND_BPS)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");

      // Execution window < 1 hour
      await expect(
        ClubTreasury.deploy(MEMBERSHIP_FEE, VOTING_PERIOD, 3599, QUORUM_BPS, MAX_SPEND_BPS)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");

      // Quorum BPS = 0 or > 10000
      await expect(
        ClubTreasury.deploy(MEMBERSHIP_FEE, VOTING_PERIOD, EXECUTION_WINDOW, 0, MAX_SPEND_BPS)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");

      await expect(
        ClubTreasury.deploy(MEMBERSHIP_FEE, VOTING_PERIOD, EXECUTION_WINDOW, 10001, MAX_SPEND_BPS)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");

      // Max spend BPS = 0 or > 10000
      await expect(
        ClubTreasury.deploy(MEMBERSHIP_FEE, VOTING_PERIOD, EXECUTION_WINDOW, QUORUM_BPS, 0)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");

      await expect(
        ClubTreasury.deploy(MEMBERSHIP_FEE, VOTING_PERIOD, EXECUTION_WINDOW, QUORUM_BPS, 10001)
      ).to.be.revertedWithCustomError(treasury, "InvalidConstructorParams");
    });
  });

  describe("2. Treasury Inflows & Contributions", function () {
    it("accepts ETH via receive() and emits Contributed", async function () {
      const amount = ethers.parseEther("1.0");
      await expect(
        outsider.sendTransaction({
          to: await treasury.getAddress(),
          value: amount,
        })
      )
        .to.emit(treasury, "Contributed")
        .withArgs(outsider.address, amount);

      expect(await treasury.treasuryBalance()).to.equal(amount);
      // Contribution does not grant membership
      expect(await treasury.isMember(outsider.address)).to.be.false;
    });

    it("accepts ETH via contribute() and emits Contributed", async function () {
      const amount = ethers.parseEther("0.5");
      await expect(treasury.connect(outsider).contribute({ value: amount }))
        .to.emit(treasury, "Contributed")
        .withArgs(outsider.address, amount);

      expect(await treasury.treasuryBalance()).to.equal(amount);
      expect(await treasury.isMember(outsider.address)).to.be.false;
    });

    it("reverts on 0 value contributions", async function () {
      await expect(
        treasury.connect(outsider).contribute({ value: 0 })
      ).to.be.revertedWithCustomError(treasury, "InvalidAmount");

      await expect(
        outsider.sendTransaction({
          to: await treasury.getAddress(),
          value: 0,
        })
      ).to.be.revertedWithCustomError(treasury, "InvalidAmount");
    });
  });

  describe("3. Membership Management (join / leave)", function () {
    it("allows a user to join with required fee", async function () {
      await expect(treasury.connect(alice).join({ value: MEMBERSHIP_FEE }))
        .to.emit(treasury, "Joined")
        .withArgs(alice.address, MEMBERSHIP_FEE);

      expect(await treasury.isMember(alice.address)).to.be.true;
      expect(await treasury.memberCount()).to.equal(1);
      expect(await treasury.treasuryBalance()).to.equal(MEMBERSHIP_FEE);
    });

    it("allows joining with excess fee, all stays in treasury", async function () {
      const excessFee = ethers.parseEther("0.05");
      await treasury.connect(bob).join({ value: excessFee });
      expect(await treasury.treasuryBalance()).to.equal(excessFee);
      expect(await treasury.isMember(bob.address)).to.be.true;
    });

    it("reverts join if fee is insufficient", async function () {
      await expect(
        treasury.connect(alice).join({ value: ethers.parseEther("0.0005") })
      ).to.be.revertedWithCustomError(treasury, "InsufficientMembershipFee");
    });

    it("reverts join if already a member", async function () {
      await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
      await expect(
        treasury.connect(alice).join({ value: MEMBERSHIP_FEE })
      ).to.be.revertedWithCustomError(treasury, "AlreadyMember");
    });

    it("allows leaving the club without refund", async function () {
      await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
      const balanceBefore = await treasury.treasuryBalance();

      await expect(treasury.connect(alice).leave())
        .to.emit(treasury, "Left")
        .withArgs(alice.address);

      expect(await treasury.isMember(alice.address)).to.be.false;
      expect(await treasury.memberCount()).to.equal(0);
      expect(await treasury.treasuryBalance()).to.equal(balanceBefore); // No refund
    });

    it("reverts leave if not a member", async function () {
      await expect(treasury.connect(outsider).leave()).to.be.revertedWithCustomError(
        treasury,
        "NotMember"
      );
    });
  });

  describe("4. Proposals Creation & Validations", function () {
    beforeEach(async function () {
      // Seed treasury with 10 ETH
      await outsider.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("10.0"),
      });
      await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
      await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });
    });

    it("allows a member to create a valid proposal", async function () {
      const amount = ethers.parseEther("1.0");
      const purpose = "Host developer workshop";

      const tx = await treasury.connect(alice).propose(recipient.address, amount, purpose);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      expect(await treasury.proposalCount()).to.equal(1);

      await expect(tx)
        .to.emit(treasury, "ProposalCreated")
        .withArgs(
          1,
          alice.address,
          recipient.address,
          amount,
          purpose,
          block.timestamp,
          block.timestamp + VOTING_PERIOD,
          block.timestamp + VOTING_PERIOD + EXECUTION_WINDOW,
          2 // snapshotMembers
        );

      const prop = await treasury.getProposal(1);
      expect(prop.proposer).to.equal(alice.address);
      expect(prop.recipient).to.equal(recipient.address);
      expect(prop.amount).to.equal(amount);
      expect(prop.purpose).to.equal(purpose);
      expect(prop.snapshotMembers).to.equal(2);
      expect(prop.yesVotes).to.equal(0);
      expect(prop.noVotes).to.equal(0);
      expect(prop.executed).to.be.false;

      expect(await treasury.status(1)).to.equal(0); // Active
    });

    it("reverts propose if non-member attempts it", async function () {
      await expect(
        treasury.connect(outsider).propose(recipient.address, ethers.parseEther("1.0"), "Test")
      ).to.be.revertedWithCustomError(treasury, "NotMember");
    });

    it("reverts propose if club has fewer than 2 members", async function () {
      // Bob leaves, leaving only Alice (1 member)
      await treasury.connect(bob).leave();
      await expect(
        treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Test")
      ).to.be.revertedWithCustomError(treasury, "InsufficientMembers");
      // Bob rejoins
      await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });
    });

    it("reverts propose if recipient is address(0) or address(this)", async function () {
      await expect(
        treasury.connect(alice).propose(ethers.ZeroAddress, ethers.parseEther("1.0"), "Test")
      ).to.be.revertedWithCustomError(treasury, "InvalidRecipient");

      await expect(
        treasury.connect(alice).propose(await treasury.getAddress(), ethers.parseEther("1.0"), "Test")
      ).to.be.revertedWithCustomError(treasury, "InvalidRecipient");
    });

    it("reverts propose if amount is 0", async function () {
      await expect(
        treasury.connect(alice).propose(recipient.address, 0, "Test")
      ).to.be.revertedWithCustomError(treasury, "InvalidAmount");
    });

    it("reverts propose if amount exceeds MAX_SPEND_BPS cap", async function () {
      const balance = await treasury.treasuryBalance();
      const maxSpend = (balance * BigInt(MAX_SPEND_BPS)) / 10000n;
      const excessAmount = maxSpend + ethers.parseEther("0.1");

      await expect(
        treasury.connect(alice).propose(recipient.address, excessAmount, "Too expensive")
      ).to.be.revertedWithCustomError(treasury, "ExceedsMaxSpend");
    });

    it("reverts propose if purpose length is 0 or > 200 bytes", async function () {
      await expect(
        treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "")
      ).to.be.revertedWithCustomError(treasury, "InvalidPurposeLength");

      const longPurpose = "a".repeat(201);
      await expect(
        treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), longPurpose)
      ).to.be.revertedWithCustomError(treasury, "InvalidPurposeLength");
    });
  });

  describe("5. Voting Logic & Attack Vectors", function () {
    let proposalId;

    beforeEach(async function () {
      // Seed balance
      await outsider.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("10.0"),
      });

      // Alice and Bob join at T0
      await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
      await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });

      // Fast forward 10 seconds so joinedAt < proposal.createdAt
      await time.increase(10);

      const tx = await treasury
        .connect(alice)
        .propose(recipient.address, ethers.parseEther("1.0"), "Audit Fee");
      await tx.wait();
      proposalId = 1;
    });

    it("allows eligible members to vote yes or no and emits Voted", async function () {
      await expect(treasury.connect(alice).vote(proposalId, true))
        .to.emit(treasury, "Voted")
        .withArgs(proposalId, alice.address, true);

      await expect(treasury.connect(bob).vote(proposalId, false))
        .to.emit(treasury, "Voted")
        .withArgs(proposalId, bob.address, false);

      const p = await treasury.getProposal(proposalId);
      expect(p.yesVotes).to.equal(1);
      expect(p.noVotes).to.equal(1);
    });

    it("ATTACK: non-member cannot vote", async function () {
      await expect(
        treasury.connect(outsider).vote(proposalId, true)
      ).to.be.revertedWithCustomError(treasury, "NotMember");
    });

    it("ATTACK: someone who joined AFTER proposal was created cannot vote", async function () {
      // Charlie joins after proposal creation
      await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });

      await expect(
        treasury.connect(charlie).vote(proposalId, true)
      ).to.be.revertedWithCustomError(treasury, "MustJoinBeforeProposal");
    });

    it("allows a member who joined in the same block/timestamp as proposal to vote", async function () {
      await ethers.provider.send("evm_setAutomine", [false]);
      const tx1 = await treasury.connect(dave).join({ value: MEMBERSHIP_FEE });
      const tx2 = await treasury.connect(dave).propose(recipient.address, ethers.parseEther("0.5"), "Same block proposal");
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_setAutomine", [true]);
      await tx1.wait();
      await tx2.wait();

      const sameBlockPropId = 2;
      await expect(treasury.connect(dave).vote(sameBlockPropId, true))
        .to.emit(treasury, "Voted")
        .withArgs(sameBlockPropId, dave.address, true);
    });

    it("ATTACK: member cannot double vote", async function () {
      await treasury.connect(alice).vote(proposalId, true);
      await expect(
        treasury.connect(alice).vote(proposalId, true)
      ).to.be.revertedWithCustomError(treasury, "AlreadyVoted");

      await expect(
        treasury.connect(alice).vote(proposalId, false)
      ).to.be.revertedWithCustomError(treasury, "AlreadyVoted");
    });

    it("ATTACK: cannot vote after voting deadline has passed", async function () {
      await time.increase(VOTING_PERIOD + 1);

      await expect(
        treasury.connect(alice).vote(proposalId, true)
      ).to.be.revertedWithCustomError(treasury, "VotingClosed");
    });

    it("ATTACK: leave then vote reverts", async function () {
      await treasury.connect(bob).leave();

      await expect(
        treasury.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(treasury, "NotMember");
    });

    it("reverts voting on non-existent proposal", async function () {
      await expect(
        treasury.connect(alice).vote(999, true)
      ).to.be.revertedWithCustomError(treasury, "ProposalDoesNotExist");
    });
  });

  describe("6. Proposal Execution & Safety Invariants", function () {
    let proposalId;
    const requestedAmount = ethers.parseEther("2.0");

    beforeEach(async function () {
      // 10 ETH in treasury
      await outsider.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("10.0"),
      });

      await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
      await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });

      await time.increase(10);

      await treasury
        .connect(alice)
        .propose(recipient.address, requestedAmount, "Community Event");
      proposalId = 1;
    });

    it("ATTACK: execute before votingEnds reverts", async function () {
      await treasury.connect(alice).vote(proposalId, true);
      await treasury.connect(bob).vote(proposalId, true);

      // Voting still active
      await expect(treasury.connect(outsider).execute(proposalId)).to.be.revertedWithCustomError(
        treasury,
        "VotingStillActive"
      );
    });

    it("ATTACK: execute a failed vote (yes <= no) reverts", async function () {
      await treasury.connect(alice).vote(proposalId, true);
      await treasury.connect(bob).vote(proposalId, false);

      await time.increase(VOTING_PERIOD + 1);

      expect(await treasury.status(proposalId)).to.equal(2); // Rejected

      await expect(treasury.connect(outsider).execute(proposalId)).to.be.revertedWithCustomError(
        treasury,
        "ProposalDidNotPass"
      );
    });

    it("ATTACK: execute when quorum is not met reverts", async function () {
      // Suppose we have 4 members
      await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });
      await treasury.connect(dave).join({ value: MEMBERSHIP_FEE });
      await time.increase(10);

      // Proposal 2 with 4 snapshot members. Quorum = 50% => 2 yes votes required.
      await treasury
        .connect(alice)
        .propose(recipient.address, ethers.parseEther("1.0"), "Quorum test");
      const p2 = 2;

      // Only Alice votes yes (1 out of 4 = 25% < 50%)
      await treasury.connect(alice).vote(p2, true);

      await time.increase(VOTING_PERIOD + 1);

      expect(await treasury.status(p2)).to.equal(2); // Rejected

      await expect(treasury.connect(outsider).execute(p2)).to.be.revertedWithCustomError(
        treasury,
        "QuorumNotMet"
      );
    });

    it("allows remaining members to execute if members leave and remaining reach adjusted quorum", async function () {
      await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });
      await treasury.connect(dave).join({ value: MEMBERSHIP_FEE });
      await time.increase(10);

      await treasury
        .connect(alice)
        .propose(recipient.address, ethers.parseEther("1.0"), "Departure test");
      const pId = 2;

      await treasury.connect(alice).vote(pId, true);

      // Charlie and Dave leave. Remaining active = 2 (Alice & Bob).
      await treasury.connect(charlie).leave();
      await treasury.connect(dave).leave();

      await time.increase(VOTING_PERIOD + 1);

      expect(await treasury.status(pId)).to.equal(1); // Passed
      await expect(treasury.connect(outsider).execute(pId))
        .to.emit(treasury, "Executed");
    });

    it("ATTACK: execute an expired proposal reverts", async function () {
      await treasury.connect(alice).vote(proposalId, true);
      await treasury.connect(bob).vote(proposalId, true);

      // Fast forward past execution window: VOTING_PERIOD + EXECUTION_WINDOW + 10
      await time.increase(VOTING_PERIOD + EXECUTION_WINDOW + 10);

      expect(await treasury.status(proposalId)).to.equal(3); // Expired

      await expect(treasury.connect(outsider).execute(proposalId)).to.be.revertedWithCustomError(
        treasury,
        "ProposalExpired"
      );
    });

    it("permissionless execution: any outsider can execute a passed proposal", async function () {
      await treasury.connect(alice).vote(proposalId, true);
      await treasury.connect(bob).vote(proposalId, true);

      await time.increase(VOTING_PERIOD + 1);

      expect(await treasury.status(proposalId)).to.equal(1); // Passed

      const recipientBalBefore = await ethers.provider.getBalance(recipient.address);
      const treasuryBalBefore = await treasury.treasuryBalance();

      // Executed by outsider
      const tx = await treasury.connect(outsider).execute(proposalId);

      await expect(tx)
        .to.emit(treasury, "Executed")
        .withArgs(proposalId, recipient.address, requestedAmount, "Community Event");

      const recipientBalAfter = await ethers.provider.getBalance(recipient.address);
      const treasuryBalAfter = await treasury.treasuryBalance();

      expect(recipientBalAfter - recipientBalBefore).to.equal(requestedAmount);
      expect(treasuryBalBefore - treasuryBalAfter).to.equal(requestedAmount);

      expect(await treasury.status(proposalId)).to.equal(4); // Executed
    });

    it("ATTACK: double execution is strictly prevented", async function () {
      await treasury.connect(alice).vote(proposalId, true);
      await treasury.connect(bob).vote(proposalId, true);
      await time.increase(VOTING_PERIOD + 1);

      await treasury.connect(outsider).execute(proposalId);

      await expect(treasury.connect(outsider).execute(proposalId)).to.be.revertedWithCustomError(
        treasury,
        "ProposalAlreadyExecuted"
      );
    });

    it("ATTACK: reentrancy attempt by malicious contract is prevented", async function () {
      // Propose to send funds to malicious contract
      const tx = await treasury
        .connect(alice)
        .propose(await malicious.getAddress(), ethers.parseEther("1.0"), "Attack Proposal");
      await tx.wait();
      const attackId = 2;

      await malicious.setTargetProposal(attackId);

      await treasury.connect(alice).vote(attackId, true);
      await treasury.connect(bob).vote(attackId, true);

      await time.increase(VOTING_PERIOD + 1);

      // Reentrancy will be blocked either by ReentrancyGuard or executed=true check
      // Our contract uses checks-effects-interactions + ReentrancyGuard!
      // In either case, the re-entrant call fails, and the attack cannot drain extra funds!
      await expect(treasury.connect(outsider).execute(attackId)).to.be.reverted;
    });

    it("INVARIANT: dynamic re-check prevents payout if balance drops below proposal amount or cap", async function () {
      // Initial balance is ~10 ETH.
      // Propose 4.5 ETH (which is <= 50% of 10 ETH)
      const bigTx = await treasury
        .connect(alice)
        .propose(recipient.address, ethers.parseEther("4.5"), "Large Proposal 1");
      await bigTx.wait();
      const p1 = 2;

      // Another proposal for 4.5 ETH
      const bigTx2 = await treasury
        .connect(alice)
        .propose(recipient.address, ethers.parseEther("4.5"), "Large Proposal 2");
      await bigTx2.wait();
      const p2 = 3;

      // Both get voted yes
      await treasury.connect(alice).vote(p1, true);
      await treasury.connect(bob).vote(p1, true);
      await treasury.connect(alice).vote(p2, true);
      await treasury.connect(bob).vote(p2, true);

      await time.increase(VOTING_PERIOD + 1);

      // Execute p1 (transfers 4.5 ETH, leaving ~5.5 ETH in treasury)
      await treasury.connect(outsider).execute(p1);

      // Now treasury balance is ~5.5 ETH.
      // 50% max spend of 5.5 ETH is 2.75 ETH!
      // Proposal 2 requests 4.5 ETH, which now exceeds 50% of remaining balance!
      await expect(treasury.connect(outsider).execute(p2)).to.be.revertedWithCustomError(
        treasury,
        "ExceedsMaxSpend"
      );
    });

    it("INVARIANT: deployer or any other non-executor has zero privilege to move funds", async function () {
      // Deployer cannot withdraw, transfer, pause, or change parameters
      // Notice: ClubTreasury has NO functions for withdraw, transfer, pause, ownership, or settings!
      expect(treasury.owner).to.be.undefined;
      expect(treasury.withdraw).to.be.undefined;
      expect(treasury.pause).to.be.undefined;
      expect(treasury.emergencyWithdraw).to.be.undefined;

      // Verify that after deployment, deployer's address has no special status
      expect(await treasury.isMember(deployer.address)).to.be.false;
    });

    it("INVARIANT: treasury accounting correctly tracks multiple proposals and donations", async function () {
      const initialBalance = await treasury.treasuryBalance();

      // Donate additional 5 ETH
      await outsider.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("5.0"),
      });

      expect(await treasury.treasuryBalance()).to.equal(initialBalance + ethers.parseEther("5.0"));

      // Pass proposal
      await treasury.connect(alice).vote(proposalId, true);
      await treasury.connect(bob).vote(proposalId, true);
      await time.increase(VOTING_PERIOD + 1);

      const balBeforeExec = await treasury.treasuryBalance();
      await treasury.connect(outsider).execute(proposalId);

      expect(await treasury.treasuryBalance()).to.equal(balBeforeExec - requestedAmount);
    });
  });
});

