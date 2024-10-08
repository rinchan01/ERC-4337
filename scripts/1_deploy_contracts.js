const { ethers } = require("hardhat");
const entryPointContract = require("../artifacts/contracts/core/EntryPoint.sol/EntryPoint.json");
const verifyingPaymasterContract = require("../artifacts/contracts/samples/VerifyingPaymaster.sol/VerifyingPaymaster.json");
const depositContract = require("../artifacts/contracts/samples/DepositPaymaster.sol/DepositPaymaster.json");
const wethTokenContract = require("../artifacts/contracts/samples/WETH.sol/WETHToken.json");
const simpleAccountFactoryContract = require("../artifacts/contracts/samples/SimpleAccountFactory.sol/SimpleAccountFactory.json");


async function main() {
      const [deployer] = await ethers.getSigners();
      const EntryPoint = new ethers.ContractFactory(
            entryPointContract.abi,
            entryPointContract.bytecode,
            deployer
      );
      const entryPoint = await EntryPoint.deploy();
      await entryPoint.waitForDeployment();
      console.log("EntryPoint deployed to:", await entryPoint.getAddress());

      const VerifyingPaymaster = new ethers.ContractFactory(
            verifyingPaymasterContract.abi,
            verifyingPaymasterContract.bytecode,
            deployer
      );
      const verifyingPaymaster = await VerifyingPaymaster.deploy(entryPoint.getAddress(), deployer.address);
      await verifyingPaymaster.waitForDeployment();
      console.log("VerifyingPaymaster deployed to:", await verifyingPaymaster.getAddress());

      const DepositPaymaster = new ethers.ContractFactory(
            depositContract.abi,
            depositContract.bytecode,
            deployer
      );
      const depositPaymaster = await DepositPaymaster.deploy(entryPoint.getAddress());
      await depositPaymaster.waitForDeployment();
      console.log("DepositPaymaster deployed to:", await depositPaymaster.getAddress());

      const WETHToken = new ethers.ContractFactory(
            wethTokenContract.abi,
            wethTokenContract.bytecode,
            deployer
      );
      const wethToken = await WETHToken.deploy(deployer.address, "Wrapped Ether", "WETH");
      await wethToken.waitForDeployment();
      console.log("WETHToken deployed to:", await wethToken.getAddress());

      const DAIToken = new ethers.ContractFactory(
            wethTokenContract.abi,
            wethTokenContract.bytecode,
            deployer
      );
      const daiToken = await DAIToken.deploy(deployer.address, "Dai Stablecoin", "DAI");
      await daiToken.waitForDeployment();
      console.log("DAIToken deployed to:", await daiToken.getAddress());

      const SimpleAccountFactory = new ethers.ContractFactory(
            simpleAccountFactoryContract.abi,
            simpleAccountFactoryContract.bytecode,
            deployer
      );
      const simpleAccountFactory = await SimpleAccountFactory.deploy(await entryPoint.getAddress());
      await simpleAccountFactory.waitForDeployment();
      console.log("SimpleAccountFactory deployed to:", await simpleAccountFactory.getAddress());
      
}

main()
      .then(() => process.exit(0))
      .catch((error) => {
            console.error(error);
            process.exit(1);
      });