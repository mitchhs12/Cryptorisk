const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("100")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    console.log(chainId)
    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
        const controls = await ethers.getContract("Controls")
        const data = await ethers.getContract("Data")
        controlsAddress = controls.address
        dataAddress = data.address
        //0x47A5Ffd0267c67A037fc10C231b91bF42b6DeF44
        //0x5FbDB2315678afecb367f032d93F642f64180aa3
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
        controlsAddress = networkConfig[chainId]["controls"]
    }
    const mainArgs = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["callbackGasLimit"],
        networkConfig[chainId]["lobbyEntranceFee"],
        controlsAddress,
        dataAddress,
    ]
    const main = await deploy("Main", {
        from: deployer,
        args: mainArgs,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("Main Deployed!")
    log("----------")

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, main.address)
    }
    if (!developmentChains.includes(network.name) && process.env.SNOWTRACE_API_KEY) {
        log("Verifying")
        await verify(main.address, mainArgs)
    }
    log("___________")
}

module.exports.tags = ["all", "main", "cryptorisk"]
