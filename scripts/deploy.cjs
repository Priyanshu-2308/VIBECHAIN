const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of ClubTreasury to Sepolia...");

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer configured! Please check .env has PRIVATE_KEY or DEPLOYER_SIGNER_KEY.");
  }
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const MEMBERSHIP_FEE = ethers.parseEther("0.001");
  const VOTING_PERIOD = 300; // 5 minutes for hackathon demo
  const EXECUTION_WINDOW = 86400; // 24 hours
  const QUORUM_BPS = 5000; // 50%
  const MAX_SPEND_BPS = 5000; // 50%

  const ClubTreasury = await ethers.getContractFactory("ClubTreasury");
  const treasury = await ClubTreasury.deploy(
    MEMBERSHIP_FEE,
    VOTING_PERIOD,
    EXECUTION_WINDOW,
    QUORUM_BPS,
    MAX_SPEND_BPS
  );

  console.log("Waiting for deployment transaction...");
  await treasury.waitForDeployment();

  const contractAddress = await treasury.getAddress();
  const deployTx = treasury.deploymentTransaction();
  const receipt = await deployTx.wait(1);
  const deployBlock = receipt ? receipt.blockNumber : await ethers.provider.getBlockNumber();

  console.log("ClubTreasury deployed successfully!");
  console.log("Contract Address:", contractAddress);
  console.log("Deploy Block:", deployBlock);

  // Extract ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/ClubTreasury.sol/ClubTreasury.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const contractData = {
    address: contractAddress,
    deployBlock: deployBlock,
    network: "sepolia",
    chainId: 11155111,
    parameters: {
      membershipFeeWei: MEMBERSHIP_FEE.toString(),
      membershipFeeEth: "0.001",
      votingPeriodSeconds: VOTING_PERIOD,
      executionWindowSeconds: EXECUTION_WINDOW,
      quorumBps: QUORUM_BPS,
      maxSpendBps: MAX_SPEND_BPS,
    },
    abi: artifact.abi,
  };

  const outputPath = path.join(__dirname, "../src/contract.json");
  fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));
  console.log("Saved contract metadata and ABI to:", outputPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});

