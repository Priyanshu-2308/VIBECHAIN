const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("STEP 2: Triage Bug Reproductions", function () {
  it("ADV-06 Repro: Hardcoded parameters in UI diverge from deployed contract getters", async function () {
    // If contract deployed with 0.002 ETH fee or 600s voting period:
    const ClubTreasury = await ethers.getContractFactory("ClubTreasury");
    const treasury = await ClubTreasury.deploy(
      ethers.parseEther("0.002"), // 0.002 instead of hardcoded 0.001
      600,                         // 600 instead of hardcoded 300
      86400,
      6000,                        // 60% instead of hardcoded 50%
      3000                         // 30% instead of hardcoded 50%
    );
    await treasury.waitForDeployment();

    // Verify contract has dynamic values
    expect(await treasury.MEMBERSHIP_FEE()).to.equal(ethers.parseEther("0.002"));
    expect(await treasury.VOTING_PERIOD()).to.equal(600n);
    expect(await treasury.QUORUM_BPS()).to.equal(6000n);
    expect(await treasury.MAX_SPEND_BPS()).to.equal(3000n);

    // Old UI had static values "0.001 ETH", "300S (5M)", "50%", "50%" hardcoded in Dashboard.jsx & Membership.jsx.
    // This repro confirms reading from contract getters is required.
  });

  it("ADV-07 Repro: Fixed 4,500 block window omits historical inflows and outflows", async function () {
    // When currentBlock is > deployBlock + 4500:
    const deployBlock = 12039018;
    const currentBlock = 12044500;
    const oldWindowFromBlock = Math.max(deployBlock, currentBlock - 4500); // 12040000

    // An event at block 12039500 is completely skipped by oldWindowFromBlock
    const eventBlock = 12039500;
    expect(eventBlock < oldWindowFromBlock).to.be.true;
    // This proves that a chunked query mechanism from deployBlock to latest is required to fulfill the PS requirement.
  });
});
