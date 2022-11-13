const { ethers, network } = require("hardhat")
const fs = require("fs")

const FRONT_END_ABI_FILE_MAIN = "../cryptorisk_frontend/constants/mainABI.json"
const FRONT_END_ADDRESSES_FILE_MAIN = "../cryptorisk_frontend/constants/mainAddresses.json"
const FRONT_END_ABI_FILE_CONTROLS = "../cryptorisk_frontend/constants/controlsABI.json"
const FRONT_END_ADDRESSES_FILE_CONTROLS = "../cryptorisk_frontend/constants/controlsAddresses.json"
const FRONT_END_ABI_FILE_DATA = "../cryptorisk_frontend/constants/dataABI.json"
const FRONT_END_ADDRESSES_FILE_DATA = "../cryptorisk_frontend/constants/dataAddresses.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        updateContractAddresses()
        updateAbi()
    }
}

async function updateContractAddresses() {
    console.log("updating contracts...")
    const main = await ethers.getContract("Main")
    const controls = await ethers.getContract("Controls")
    const data = await ethers.getContract("Data")

    const mainAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE_MAIN, "utf8"))
    const controlsAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE_CONTROLS, "utf8"))
    const dataAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE_DATA, "utf8"))

    if (network.config.chainId.toString() in mainAddresses) {
        if (!mainAddresses[network.config.chainId.toString()].includes(main.address)) {
            mainAddresses[network.config.chainId.toString()].push(main.address)
            //console.log(mainAddresses[network.config.chainId.toString()])
        } else {
            mainAddresses[network.config.chainId.toString()] = [main.address]
        }
    }
    if (network.config.chainId.toString() in controlsAddresses) {
        if (!controlsAddresses[network.config.chainId.toString()].includes(controls.address)) {
            controlsAddresses[network.config.chainId.toString()].push(controls.address)
        } else {
            controlsAddresses[network.config.chainId.toString()] = [controls.address]
        }
    }
    if (network.config.chainId.toString() in dataAddresses) {
        if (!dataAddresses[network.config.chainId.toString()].includes(data.address)) {
            dataAddresses[network.config.chainId.toString()].push(data.address)
        } else {
            dataAddresses[network.config.chainId.toString()] = [data.address]
        }
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE_MAIN, JSON.stringify(mainAddresses))
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE_CONTROLS, JSON.stringify(controlsAddresses))
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE_DATA, JSON.stringify(dataAddresses))
}

async function updateAbi() {
    console.log("updating abi")
    const main = await ethers.getContract("Main")
    fs.writeFileSync(FRONT_END_ABI_FILE_MAIN, main.interface.format(ethers.utils.FormatTypes.json))
    const controls = await ethers.getContract("Controls")
    fs.writeFileSync(FRONT_END_ABI_FILE_CONTROLS, controls.interface.format(ethers.utils.FormatTypes.json))
    const data = await ethers.getContract("Data")
    fs.writeFileSync(FRONT_END_ABI_FILE_DATA, data.interface.format(ethers.utils.FormatTypes.json))
}

module.exports.tags = ["all", "frontend"]
