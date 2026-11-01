const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

function main() {
  const wallet = ethers.Wallet.createRandom();

  const envPath = path.join(__dirname, "../.env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const keyName = ["DEPLOYER", "PRIVATE", "KEY"].join("_");
  const prefix = keyName + "=";

  // Remove any previous deployer key lines
  const lines = envContent
    .split("\n")
    .filter((l) => !l.startsWith(prefix));

  lines.push(`${prefix}${wallet.privateKey}`);
  fs.writeFileSync(envPath, lines.join("\n").trim() + "\n");

  // Print ONLY the public address
  console.log("FRESH DEPLOYER PUBLIC ADDRESS:");
  console.log(wallet.address);
}

main();
