import { ethers } from "ethers";
import contractData from "../contract.json";

export const PUBLIC_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX_CHAIN_ID = "0xaa36a7";

export function getPublicProvider() {
  return new ethers.JsonRpcProvider(PUBLIC_SEPOLIA_RPC);
}

export function getReadOnlyContract() {
  if (!contractData.address || contractData.address === "") {
    return null;
  }
  const provider = getPublicProvider();
  return new ethers.Contract(contractData.address, contractData.abi, provider);
}

export async function getSignerContract() {
  if (!window.ethereum) {
    throw new Error("No Web3 wallet found. Please install MetaMask or another Ethereum wallet.");
  }

  const browserProvider = new ethers.BrowserProvider(window.ethereum);
  const signer = await browserProvider.getSigner();

  if (!contractData.address || contractData.address === "") {
    throw new Error("Contract is not yet deployed or configured.");
  }

  return new ethers.Contract(contractData.address, contractData.abi, signer);
}

export async function checkAndSwitchNetwork() {
  if (!window.ethereum) return false;
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) !== SEPOLIA_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }],
        });
        return true;
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_HEX_CHAIN_ID,
                chainName: "Sepolia Test Network",
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "SEP",
                  decimals: 18,
                },
                rpcUrls: [PUBLIC_SEPOLIA_RPC],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          return true;
        }
        throw switchError;
      }
    }
    return true;
  } catch (err) {
    console.error("Failed to switch network:", err);
    return false;
  }
}

