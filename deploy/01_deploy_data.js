const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const data = await deploy("Data", {
        from: deployer,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    log("Controls Deployed!");
    log("----------");

    if (!developmentChains.includes(network.name) && process.env.SNOWTRACE_API_KEY) {
        log("Verifying");
        await verify(controls.address, mainArgs);
    }
};

module.exports.tags = ["all", "data", "storage"];
