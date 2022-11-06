const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [];

    const deployContract = await deploy("Deploy", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    const attackContract = await deploy("Attack", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    const fortifyContract = await deploy("Fortify", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    log("Gameplay Controls Deployed!");
    log("----------");

    if (!developmentChains.includes(network.name) && process.env.SNOWTRACE_API_KEY) {
        log("Verifying");
        await verify(deployContract.address, mainArgs);
        await verify(attackContract.address, mainArgs);
        await verify(fortifyContract.address, mainArgs);
    }
};

module.exports.tags = ["all", "controls", "gameplay"];
