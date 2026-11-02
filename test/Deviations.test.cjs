const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("STEP 1: Contract Spec Deviation Tests", function () {
  let ClubTreasury, treasury;
  let deployer, alice, bob, charlie, recipient, outsider;

  const MEMBERSHIP_FEE = ethers.parseEther("0.001");
  const VOTING_PERIOD = 300;
  const EXECUTION_WINDOW = 86400;
  const QUORUM_BPS = 5000; // 50%
  const MAX_SPEND_BPS = 5000; // 50%

  beforeEach(async function () {
    [deployer, alice, bob, charlie, recipient, outsider] = await ethers.getSigners();
    ClubTreasury = await ethers.getContractFactory("ClubTreasury");
    treasury = await ClubTreasury.deploy(
      MEMBERSHIP_FEE,
      VOTING_PERIOD,
      EXECUTION_WINDOW,
      QUORUM_BPS,
      MAX_SPEND_BPS
    );
    await treasury.waitForDeployment();
  });

  it("Deviation (i): Contract rejects propose() when memberCount == 1 (Spec requires NO minimum member count)", async function () {
    // Spec: "propose() by members only, with NO minimum member count."
    // Current Contract: reverts with InsufficientMembers() if memberCount < 2.
    await outsider.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5.0"),
    });

    await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
    expect(await treasury.memberCount()).to.equal(1);

    // According to SPEC, alice (a member) should be able to propose.
    // In current contract, this REVERTS with InsufficientMembers.
    await expect(
      treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Sole founder proposal")
    ).to.be.revertedWithCustomError(treasury, "InsufficientMembers");
  });

  it("Deviation (ii): Quorum passes using effectiveSnapshot where snapshotMembers*QUORUM_BPS fails (Spec requires snapshotMembers ONLY)", async function () {
    // Spec: "Quorum uses snapshotMembers ONLY (never the current memberCount)."
    // Current Contract: uses min(memberCount, snapshotMembers).
    await outsider.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("10.0"),
    });

    // 4 members join
    await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(deployer).join({ value: MEMBERSHIP_FEE });
    await time.increase(10);

    // Proposal created with snapshotMembers = 4.
    // Under Spec: 50% of 4 = 2 votes needed.
    await treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Quorum test");
    const pId = 1;

    // Alice votes yes (1 vote)
    await treasury.connect(alice).vote(pId, true);

    // Bob, Charlie, Deployer leave -> memberCount drops to 1
    await treasury.connect(bob).leave();
    await treasury.connect(charlie).leave();
    await treasury.connect(deployer).leave();

    await time.increase(VOTING_PERIOD + 1);

    // Under Spec: yesVotes (1) * 10000 < snapshotMembers (4) * 5000 (20000) -> MUST REVERT with QuorumNotMet
    // Under Current Contract: effectiveSnapshot = min(1, 4) = 1. yesVotes (1) * 10000 >= 1 * 5000 -> PASSES & EXECUTES!
    const prop = await treasury.getProposal(pId);
    expect(prop.snapshotMembers).to.equal(4);
    expect(prop.yesVotes).to.equal(1);
    expect(await treasury.memberCount()).to.equal(1);

    // Current contract execution succeeds because of effectiveSnapshot deviation:
    await expect(treasury.connect(outsider).execute(pId)).to.emit(treasury, "Executed");
  });

  it("Deviation (iii): Contract allows vote when joinedAt == createdAt (Spec requires joinedAt STRICTLY LESS than createdAt)", async function () {
    // Spec: "vote() only for members with joinedAt STRICTLY LESS than createdAt"
    // Current Contract: `joinedAt > createdAt` reverts, but `joinedAt == createdAt` is ALLOWED.
    await outsider.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5.0"),
    });

    await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });

    // Mine join and propose in the same block/timestamp
    await ethers.provider.send("evm_setAutomine", [false]);
    const tx1 = await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });
    const tx2 = await treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Same block vote test");
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_setAutomine", [true]);
    await tx1.wait();
    await tx2.wait();

    const prop = await treasury.getProposal(1);
    const charlieJoinedAt = await treasury.joinedAt(charlie.address);
    expect(charlieJoinedAt).to.equal(prop.createdAt); // joinedAt == createdAt

    // Under Spec: Charlie joinedAt is NOT strictly less than createdAt, so voting MUST revert.
    // Under Current Contract: Charlie IS allowed to vote because code checks `>` instead of `>=`.
    await expect(treasury.connect(charlie).vote(1, true))
      .to.emit(treasury, "Voted")
      .withArgs(1, charlie.address, true);
  });
});
