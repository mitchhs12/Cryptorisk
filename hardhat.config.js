require("solidity-coverage")
require("hardhat-gas-reporter")
require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()
require("@nomiclabs/hardhat-ethers")
require("@nomicfoundation/hardhat-chai-matchers")
require("hardhat-deploy")
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL
const KOVAN_RPC_URL = process.env.KOVAN_RPC_URL
const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL
const AVALANCHE_TESTNET_RPC_URL = process.env.AVALANCHE_TESTNET_RPC_URL
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
// optional
const MNEMONIC = process.env.MNEMONIC || "your mnemonic"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "Your etherscan API key"
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "Your polygonscan API key"
const REPORT_GAS = process.env.REPORT_GAS

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        localhost: {
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        // kovan: {
        //     url: KOVAN_RPC_URL,
        //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        //     saveDeployments: true,
        //     chainId: 42,
        // },
        // goerli: {
        //     url: GOERLI_RPC_URL,
        //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        //     saveDeployments: true,
        //     chainId: 5,
        // },
        // mainnet: {
        //     url: MAINNET_RPC_URL,
        //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        //     saveDeployments: true,
        //     chainId: 1,
        // },
        // polygon: {
        //     url: POLYGON_MAINNET_RPC_URL,
        //     accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
        //     saveDeployments: true,
        //     chainId: 137,
        // },
        fuji: {
            url: AVALANCHE_TESTNET_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
            saveDeployments: true,
            chainId: 43113,
            gasPrice: 225000000000,
        },
    },
    etherscan: {
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
            kovan: ETHERSCAN_API_KEY,
            polygon: POLYGONSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    contractSizer: {
        runOnCompile: false,
        only: ["Setup"],
    },
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        player: {
            default: 1,
        },
    },
    solidity: {
        compilers: [
            {
                version: "0.8.8",
            },
        ],
    },
    mocha: {
        timeout: 200000, // 200 seconds max for running tests
    },
}
