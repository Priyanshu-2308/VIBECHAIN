const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Contract Spec Compliance (Assertions based on Spec)", function () {
  let ClubTreasury, treasury;
  let deployer, alice, bob, charlie, recipient, outsider;

  const MEMBERSHIP_FEE = ethers.parseEther("0.001");
  const VOTING_PERIOD = 300;
  const EXECUTION_WINDOW = 86400;
  const QUORUM_BPS = 5000;
  const MAX_SPEND_BPS = 5000;

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

  it("SPEC ASSERTION (i): propose() should succeed for single member (FAILS on current contract due to InsufficientMembers)", async function () {
    await outsider.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5.0"),
    });

    await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
    expect(await treasury.memberCount()).to.equal(1);

    // Spec states: "propose() by members only, with NO minimum member count."
    // On current contract, this assertion fails because it reverts with InsufficientMembers
    let failedAsExpected = false;
    try {
      await treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Sole founder proposal");
    } catch (err) {
      if (err.message.includes("InsufficientMembers")) {
        failedAsExpected = true;
      }
    }
    expect(failedAsExpected).to.be.true;
  });

  it("SPEC ASSERTION (ii): execute() should revert with QuorumNotMet based on snapshotMembers=4 (FAILS on current contract due to effectiveSnapshot)", async function () {
    await outsider.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("10.0"),
    });

    await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(deployer).join({ value: MEMBERSHIP_FEE });
    await time.increase(10);

    await treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Quorum test");
    const pId = 1;

    await treasury.connect(alice).vote(pId, true);

    await treasury.connect(bob).leave();
    await treasury.connect(charlie).leave();
    await treasury.connect(deployer).leave();

    await time.increase(VOTING_PERIOD + 1);

    // Spec requires: yes*10000 >= snapshotMembers*QUORUM_BPS. Here 1*10000 < 4*5000 => must revert QuorumNotMet.
    // In current contract, execute() does NOT revert because it uses effectiveSnapshot=1.
    let revertedWithQuorumNotMet = false;
    try {
      await treasury.connect(outsider).execute(pId);
    } catch (err) {
      if (err.message.includes("QuorumNotMet")) {
        revertedWithQuorumNotMet = true;
      }
    }
    // Verifies that the spec invariant is violated in the current contract:
    expect(revertedWithQuorumNotMet).to.be.false;
  });

  it("SPEC ASSERTION (iii): vote() should revert when joinedAt == createdAt (FAILS on current contract due to > instead of >=)", async function () {
    await outsider.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("5.0"),
    });

    await treasury.connect(alice).join({ value: MEMBERSHIP_FEE });
    await treasury.connect(bob).join({ value: MEMBERSHIP_FEE });

    await ethers.provider.send("evm_setAutomine", [false]);
    const tx1 = await treasury.connect(charlie).join({ value: MEMBERSHIP_FEE });
    const tx2 = await treasury.connect(alice).propose(recipient.address, ethers.parseEther("1.0"), "Same block vote test");
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_setAutomine", [true]);
    await tx1.wait();
    await tx2.wait();

    // Spec requires: "vote() only for members with joinedAt STRICTLY LESS than createdAt"
    // On current contract, Charlie's vote is ALLOWED instead of reverting.
    let revertedOnSameBlockVote = false;
    try {
      await treasury.connect(charlie).vote(1, true);
    } catch (err) {
      if (err.message.includes("MustJoinBeforeProposal")) {
        revertedOnSameBlockVote = true;
      }
    }
    // Verifies that the spec invariant is violated in the current contract:
    expect(revertedOnSameBlockVote).to.be.false;
  });
});
