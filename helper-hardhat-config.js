const { ethers } = require("hardhat");

const networkConfig = {
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        lobbyEntranceFee: "100000000000000000", //0.1 ETH
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", //30 gwei
        subscriptionId: "5603",
        callbackGasLimit: "500000", //500,000 gas
        interval: "30",
    },
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        lobbyEntranceFee: "100000000000000000", //0.1 ETH
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", //30 gwei
        subscriptionId: "5603", // this needs to be changed
        callbackGasLimit: "500000", //500,000 gas
        interval: "30",
    },
    31337: {
        name: "hardhat",
        lobbyEntranceFee: "100000000000000000", //0.1 ETH
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", //30 gwei
        callbackGasLimit: "500000", //500,000 gas
        interval: "30",
    },
    43113: {
        name: "fuji",
        vrfCoordinatorV2: "0x2eD832Ba664535e5886b75D64C46EB9a228C2610",
        lobbyEntranceFee: "100000000000000000",
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        gasLane: "0x354d2f95da55398f44b7cff77da56283d9c6c829a4bdf1bbcaf2ad6a4d081f61",
        subscriptionId: "143",
        callbackGasLimit: "500000", //500,000 gas
        interval: "30",
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};
