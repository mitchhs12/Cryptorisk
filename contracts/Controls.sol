// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "hardhat/console.sol";
import "./Main.sol";

interface IData {
    function initializeContinents() external;

    function getContinentOwner(uint continent) external view returns (uint8);

    function getContinentBonus(uint continent) external view returns (uint8);

    function pushToTerritories(uint8) external;

    function getTerritoryOwner(uint) external returns (uint8);

    function addTroopToTerritory(uint index) external;

    function updateContinents() external;

    function setControlsAddress(address controls) external;
}

contract Controls is IControls, VRFConsumerBaseV2 {
    event CurrentPlayer(address indexed player);
    event ReceivedMain(address indexed main);
    event Deploying();
    event Attacking();
    event Fortifying();
    event RequestedRandomness(uint256 indexed requestId);
    event ReceivedRandomWords();

    // enums

    enum mainAddressSent {
        TRUE,
        FALSE
    }

    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    // variables
    uint256[] s_diceWords;
    address private main_address;
    address private data_address;
    mainAddressSent public s_mainSet;
    uint8 public s_playerTurn;
    address payable[] s_playersArray;
    uint8 public s_troopsToDeploy;

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        address data
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        s_mainSet = mainAddressSent.FALSE;
        s_playerTurn = 3;
        s_troopsToDeploy = 0;
        data_address = data;
    }

    modifier onlyMain() {
        require(msg.sender == main_address);
        _;
    }

    function set_main_address(address main) external {
        require(s_mainSet == mainAddressSent.FALSE);
        emit ReceivedMain(main);
        main_address = main;
        s_mainSet = mainAddressSent.TRUE;
        IData(data_address).setControlsAddress(address(this));
    }

    function deploy_control(uint8 amountToDeploy, uint8 location)
        external
        onlyMain
    {
        emit Deploying();
        for (uint i = 0; i < amountToDeploy; i++) {
            IData(data_address).addTroopToTerritory(location);
        }
        s_troopsToDeploy -= amountToDeploy;
    }

    function set_players(address payable[] memory players) external onlyMain {
        s_playersArray = players;
        IData(data_address).initializeContinents();
        next_player();
    }

    function next_player() private {
        if (s_playerTurn == s_playersArray.length) {
            s_playerTurn = 0;
        } else {
            s_playerTurn++;
        }
        s_troopsToDeploy = 0;
        IData(data_address).updateContinents();
        for (uint c = 0; c < 6; c++) {
            if (IData(data_address).getContinentOwner(c) == s_playerTurn) {
                s_troopsToDeploy += IData(data_address).getContinentBonus(c);
            }
        }
        uint8 totalTerritories = 0;
        for (uint i = 0; i < 42; i++) {
            if (IData(data_address).getTerritoryOwner(i) == s_playerTurn) {
                totalTerritories++;
            }
        }
        if (totalTerritories < 9) {
            s_troopsToDeploy += 3;
        } else {
            s_troopsToDeploy += totalTerritories / 3;
        }
    }

    function attack_control() external onlyMain {
        emit Attacking();
    }

    function fortify_control() external onlyMain {
        emit Fortifying();
        next_player();
    }

    function push_to_territories(uint8 playerAwarded) external onlyMain {
        IData(data_address).pushToTerritories(playerAwarded);
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

    function add_troop_to_territory(uint index) external onlyMain {
        IData(data_address).addTroopToTerritory(index);
    }

    function get_territory_owner(uint j)
        external
        onlyMain
        returns (uint owner)
    {
        IData(data_address).getTerritoryOwner(j);
        return owner;
    }

    function get_troops_to_deploy() public view returns (uint8) {
        return s_troopsToDeploy;
    }
}
