require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

let SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
if (SEPOLIA_RPC_URL.includes("eth-sepoliabeacon.g.alchemy.com")) {
  SEPOLIA_RPC_URL = SEPOLIA_RPC_URL.replace("eth-sepoliabeacon.g.alchemy.com", "eth-sepolia.g.alchemy.com");
}

const signerKey =
  process.env["DEPLOYER_PRIVATE_KEY"] ||
  process.env["PRIVATE_KEY"] ||
  process.env["DEPLOYER_SIGNER_KEY"];
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const accounts = (signerKey && signerKey.trim().length > 0)
  ? [signerKey.trim().startsWith("0x") ? signerKey.trim() : `0x${signerKey.trim()}`]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: accounts,
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
