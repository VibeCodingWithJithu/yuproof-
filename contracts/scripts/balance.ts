import { network } from "hardhat";

const { ethers } = await network.getOrCreate();
const [signer] = await ethers.getSigners();
const bal = await ethers.provider.getBalance(signer.address);
console.log(`${signer.address}: ${ethers.formatEther(bal)} POL`);
