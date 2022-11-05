const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = "1000000000000000000"; // LINK)
const GAS_PRICE_LINK = "1000000000"; // (link per gas) calculated value based on the gas price of the chain

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK];

    if (developmentChains.includes(network.name)) {
        log("Local network detected! Deploying Mocks!");
        // deploy a mock vrfcoordinator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        });
        log("Mocks Deployed!");
        log("----------");
    }
};

module.exports.tags = ["all", "mocks", "VRFCoordinatorV2Mock"];
