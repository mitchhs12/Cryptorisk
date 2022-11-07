// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "hardhat/console.sol";
import "./Main.sol";

contract Controls is IControls, VRFConsumerBaseV2 {
    event CurrentPlayer(address indexed player);
    event ReceivedMain(address indexed main);
    event Deploying();
    event Attacking();
    event Fortifying();
    event RequestedRandomness(uint256 indexed requestId);
    event ReceivedRandomWords();

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    address main_address;
    uint256[] s_diceWords;

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
    }

    modifier onlyMain() {
        require(msg.sender == main_address);
        _;
    }

    function setMainAddress(address main) external {
        emit ReceivedMain(main);
        main_address = main;
    }

    function deploy_control() external onlyMain returns (uint) {
        emit Deploying();
        uint num = 100;
        return num;
    }

    function attack_control() external onlyMain {
        emit Attacking();
    }

    function fortify_control() external onlyMain {
        emit Fortifying();
    }

    function requestRandomness(uint32 num_words) private {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            num_words
        );
        emit RequestedRandomness(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_diceWords = randomWords;
        emit ReceivedRandomWords();
    }
}
