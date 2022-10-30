const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
    "../smartcontract-lottery-frontend/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../smartcontract-lottery-frontend/constants/abi.json";

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...");
        updateContractAddresses();
        updateAbi();
    }
};

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Setup");
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"));
    if (network.config.chainId.toString() in currentAddresses) {
        if (!currentAddresses[network.config.chainId.toString()].includes(raffle.address)) {
            currentAddresses[network.config.chainId.toString()].push(raffle.address);
            console.log(currentAddresses[network.config.chainId.toString()]);
        }
    } else {
        currentAddresses[network.config.chainId.toString()] = [raffle.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json));
}

module.exports.tags = ["all", "frontend"];
