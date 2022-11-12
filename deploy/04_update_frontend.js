const { ethers, network } = require("hardhat")
const fs = require("fs")

const FRONT_END_ADDRESSES_FILE = "../cryptorisk_frontend/constants/contractAddresses.json"
const FRONT_END_ABI_FILE = "../cryptorisk_frontend/constants/abi.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        updateContractAddresses()
        updateAbi()
    }
}

async function updateContractAddresses() {
    const main = await ethers.getContract("Main")
    const controls = await ethers.getContract("Controls")
    const data = await ethers.getContract("Data")
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
    if (network.config.chainId.toString() in currentAddresses) {
        if (!currentAddresses[network.config.chainId.toString()].includes(main.address)) {
            currentAddresses[network.config.chainId.toString()].push(main.address)
        }
    } else {
        currentAddresses[network.config.chainId.toString()] = [main.address]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

async function updateAbi() {
    const main = await ethers.getContract("Main")
    fs.writeFileSync(FRONT_END_ABI_FILE, main.interface.format(ethers.utils.FormatTypes.json))
}

module.exports.tags = ["all", "frontend"]
