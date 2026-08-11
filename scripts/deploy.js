const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Starting deployment...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Get base plan amount from env or default to 1 ether (1 USDT with 18 decimals)
  const basePlanAmount = process.env.BASE_PLAN_AMOUNT || hre.ethers.parseUnits("1", 18);
  
  let usdtAddress = process.env.USDT_CONTRACT_ADDRESS;

  // If we are on a testnet or local network and no USDT address is provided, deploy a mock
  if (hre.network.name !== 'bscMainnet' && !usdtAddress) {
    console.log("Deploying MockUSDT for testing...");
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    console.log("MockUSDT deployed to:", usdtAddress);
  } else {
    console.log("Using existing USDT at:", usdtAddress);
  }

  if (!usdtAddress) {
    throw new Error("No USDT address found and not deploying mock!");
  }

  // Deploy SimpleOnBooster
  console.log("Deploying SimpleOnBooster...");
  const SimpleOnBooster = await hre.ethers.getContractFactory("SimpleOnBooster");
  
  const booster = await SimpleOnBooster.deploy(usdtAddress, basePlanAmount);
  await booster.waitForDeployment();
  const boosterAddress = await booster.getAddress();

  console.log("SimpleOnBooster deployed to:", boosterAddress);

  console.log("=========================================");
  console.log("Deployment Successful!");
  console.log(`USDT Address: ${usdtAddress}`);
  console.log(`Booster Address: ${boosterAddress}`);
  console.log("=========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
