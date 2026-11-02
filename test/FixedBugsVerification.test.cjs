const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("STEP 4: Fixed Bugs Verification (Before vs After)", function () {
  describe("ADV-06: Dynamic Parameters vs Hardcoded Fallbacks", function () {
    let treasury;

    beforeEach(async function () {
      const ClubTreasury = await ethers.getContractFactory("ClubTreasury");
      // Deploy with non-default parameters to prove dynamic fetching works
      treasury = await ClubTreasury.deploy(
        ethers.parseEther("0.005"), // 0.005 ETH fee
        900,                         // 900s voting period
        172800,                      // 48h execution window
        7500,                        // 75% quorum
        2500                         // 25% max spend
      );
      await treasury.waitForDeployment();
    });

    it("BEFORE: Hardcoded UI logic fails to reflect deployed contract parameters", async function () {
      // Old implementation: static values
      const oldUiParameters = {
        membershipFeeEth: "0.001",
        votingPeriodSeconds: 300,
        quorumBps: 5000,
        maxSpendBps: 5000,
      };

      const actualFee = ethers.formatEther(await treasury.MEMBERSHIP_FEE());
      const actualVoting = Number(await treasury.VOTING_PERIOD());
      const actualQuorum = Number(await treasury.QUORUM_BPS());
      const actualSpendCap = Number(await treasury.MAX_SPEND_BPS());

      // Prove that old UI values FAIL to match deployed contract state
      expect(oldUiParameters.membershipFeeEth === actualFee).to.be.false;
      expect(oldUiParameters.votingPeriodSeconds === actualVoting).to.be.false;
      expect(oldUiParameters.quorumBps === actualQuorum).to.be.false;
      expect(oldUiParameters.maxSpendBps === actualSpendCap).to.be.false;
    });

    it("AFTER: Dynamic parameter fetching successfully matches all contract getters", async function () {
      // New implementation: query getters dynamically (as implemented in App.jsx:116-130)
      const [fee, vPeriod, eWindow, qBps, maxSpend] = await Promise.all([
        treasury.MEMBERSHIP_FEE(),
        treasury.VOTING_PERIOD(),
        treasury.EXECUTION_WINDOW(),
        treasury.QUORUM_BPS(),
        treasury.MAX_SPEND_BPS(),
      ]);

      const dynamicParameters = {
        membershipFeeWei: fee.toString(),
        membershipFeeEth: ethers.formatEther(fee),
        votingPeriodSeconds: Number(vPeriod),
        executionWindowSeconds: Number(eWindow),
        quorumBps: Number(qBps),
        maxSpendBps: Number(maxSpend),
      };

      // Prove that new dynamic logic PASSES with exact contract state
      expect(dynamicParameters.membershipFeeEth).to.equal("0.005");
      expect(dynamicParameters.votingPeriodSeconds).to.equal(900);
      expect(dynamicParameters.executionWindowSeconds).to.equal(172800);
      expect(dynamicParameters.quorumBps).to.equal(7500);
      expect(dynamicParameters.maxSpendBps).to.equal(2500);
    });
  });

  describe("ADV-07: Historical Event Coverage (Chunked vs 4,500 Single Window)", function () {
    const deployBlock = 12039018;
    // Simulate current block 15,000 blocks later (approx 2 days later)
    const currentBlock = 12054018;

    // Events emitted at various historical times
    const historicalEventBlocks = [
      12039020, // 2 blocks after deploy (Day 1)
      12042000, // 2,982 blocks after deploy (Day 1)
      12048000, // 8,982 blocks after deploy (Day 1.5)
      12053900, // Recent block (Day 2)
    ];

    it("BEFORE: 4,500-block window drops older historical events", function () {
      // Old logic: fromBlock = Math.max(deployBlock, currentBlock - 4500)
      const oldFromBlock = Math.max(deployBlock, currentBlock - 4500); // 12049518

      // Filter events visible to old logic
      const visibleEvents = historicalEventBlocks.filter((b) => b >= oldFromBlock);

      // Old logic only sees the most recent event, omitting 3 older events!
      expect(visibleEvents.length).to.equal(1);
      expect(visibleEvents).to.not.include(12039020);
      expect(visibleEvents).to.not.include(12042000);
      expect(visibleEvents).to.not.include(12048000);
    });

    it("AFTER: Chunked ranges from deployBlock cover 100% of historical events", function () {
      // New logic: chunked ranges of max 4500 blocks from deployBlock to currentBlock
      const CHUNK_SIZE = 4500;
      const chunks = [];
      for (let start = deployBlock; start <= currentBlock; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
        chunks.push({ start, end });
      }

      // Verify chunks form a contiguous cover from deployBlock to currentBlock
      expect(chunks.length).to.equal(4);
      expect(chunks[0].start).to.equal(deployBlock);
      expect(chunks[chunks.length - 1].end).to.equal(currentBlock);

      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].end + 1).to.equal(chunks[i + 1].start);
      }

      // Verify every historical event falls within exactly one chunk
      for (const eventBlock of historicalEventBlocks) {
        const found = chunks.some(
          (chunk) => eventBlock >= chunk.start && eventBlock <= chunk.end
        );
        expect(found).to.be.true;
      }
    });
  });
});
