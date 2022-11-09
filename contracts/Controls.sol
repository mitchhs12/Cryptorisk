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

    function addTroopToTerritory(uint index) external;

    function updateContinents() external;

    function setControlsAddress(address controls) external;

    function getNeighbours(uint territory)
        external
        view
        returns (uint8[] memory);

    function getTerritoryOwner(uint) external returns (uint8);

    function getTroopCount(uint territory) external view returns (uint256);

    function removeTroopFromTerritory(uint index) external;
}

contract Controls is IControls, VRFConsumerBaseV2 {
    event CurrentPlayer(address indexed player);
    event ReceivedMain(address indexed main);
    event Deploying(address);
    event Attacking(address);
    event Fortifying(address);
    event DiceRolled();
    event RollingDice(uint256 indexed requestId);

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
        data_address = data;
        s_mainSet = mainAddressSent.FALSE;
        s_playerTurn = 3;
        s_troopsToDeploy = 0;
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

    function set_players(address payable[] memory players) external onlyMain {
        s_playersArray = players;
        IData(data_address).initializeContinents();
        next_player();
    }

    function next_player() private {
        s_playerTurn++;
        if (s_playerTurn == 4) {
            s_playerTurn = 0;
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

    function deploy_control(uint8 amountToDeploy, uint8 location)
        external
        onlyMain
        returns (bool)
    {
        emit Deploying(s_playersArray[s_playerTurn]);
        for (uint i = 0; i < amountToDeploy; i++) {
            IData(data_address).addTroopToTerritory(location);
        }
        s_troopsToDeploy -= amountToDeploy;
        if (s_troopsToDeploy == 0) {
            return true; // returns true if all troops are deployed
        }
        return false;
    }

    function attack_control(
        uint8 territoryOwned,
        uint8 territoryAttacking,
        uint256 attackingArmies // could
    ) external onlyMain {
        require(
            validate_attackable(territoryOwned, territoryAttacking),
            "Territory you are trying to attack is not a neighbour!"
        );
        require(
            (attackingArmies <
                IData(data_address).getTroopCount(territoryOwned)) &&
                (attackingArmies > 0),
            "You cannot attack with that many troops!"
        );
        emit Attacking(s_playersArray[s_playerTurn]);

        uint256 defendingArmies = IData(data_address).getTroopCount(
            territoryAttacking
        );
        if (defendingArmies > 2) {
            defendingArmies = 2;
        } else {
            defendingArmies = 1;
        }
        uint8 num_words = getArmies(attackingArmies, defendingArmies);
        console.log("got through atack control");
        requestRandomness(num_words);

        // 1. Player clicks on their own territory
        // 2. Player clicks on enemy territory.
        // 3. Player chooses how many troops to attack with.
        // 4. Player attacks
        // for (int i =0; i< 6;i++) {
        //     if (neighbours[i] == territory)
        // }
    }

    /* 
    function battle(attackingArmies, defendingArmies, territoryOwned, territoryAttacking, randomWords) private {
        int8[] memory attackerRolls;
        int8[] memory defenderRolls;
        int8[] memory troops;
        for (int i = 0; i < attackingArmies + defendingArmies; i++) {
            if (i < attackingArmies) {
                attackerRolls.push(randomWords[i] % 6)
            } else {
                defenderRolls.push(randomWords[i] % 6)
            }
            troops.push(1)
        }
        
        // Sorting the two rolls arrays
        insertionSort(attackerRolls);
        insertionSort(defenderRolls);
        uint attacks;
        if (attackingArmies > defendingArmies) {
            attacks = defendingArmies;
        } else {
            attacks = attackingArmies;
        }
        for (int i = 0; i < attacks) {
            if (attackerRolls[i] > defenderRolls[i]) {
                // attacker wins
                IData(data_address).removeTroopFromTerritory(territoryAttacking);
                
            } else {
                // defender wins
                IData(data_address).removeTroopFromTerritory(territoryOwned);
            }

        }
    }

    function insertionSort(int arr[]) {
        uint i, key, j;
        for (i = 1; i < arr.length; i++) {
            key = arr[i]
            j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j+1] = arr[j];
                j = j - 1;
            }
            arr[j +1]=key;
        }
    }

    */

    function fortify_control() external onlyMain {
        //need to add parameters
        emit Fortifying(s_playersArray[s_playerTurn]);
        /*
        require(
            validateFortifiable(territoryMovingFrom, territoryMovingTo),
            "Territory you are trying move troops to is not a neighbour!"
        );
        require(
            (troopsMoving <
                IData(data_address).getTroopCount(territoryMovingFrom)) &&
                (troopsMoving > 0),
            "You cannot move that many troops!"
        );

        for (int i = 0; i < troopsMoving; i++) {
            IData(data_address).addTroopToTerritory(territoryMovingTo);
            IData(data_address).removeTroopFromTerritory(territoryMovingFrom);
        }
        */
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
        emit RollingDice(requestId);
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_diceWords = randomWords;
        emit DiceRolled();
        console.log(s_diceWords.length);
    }

    function validate_owner(uint8 territory_clicked) internal returns (bool) {
        uint8 territory_owner = IData(data_address).getTerritoryOwner(
            territory_clicked
        );
        if (territory_owner == s_playerTurn) {
            return true;
        } else {
            return false;
        }
    }

    /*
    function validateFortifiable(uint8 territoryMovingFrom, uint8 territoryMovingTo) internal returns (bool) {
        require(
            IData(data_address).getTroopCount(territoryMovingFrom) > 1,
            "You must have more than 1 troop to move!"
        );
        require(
            validate_owner(territoryMovingFrom) && validate_owner(territoryMovingTo),
            "You must own both territories to move troops!"
        );
        uint8[] memory neighbours = IData(data_address).getNeighbours(
            territoryMovingFrom
        );
        for (uint i = 0; i < 6; i++) {
            if ((territoryMovingTo == neighbours[i])) {
                return true;
            }
        }
        return false;
    }
    */

    function validate_attackable(uint8 territoryOwned, uint8 territoryAttacking)
        internal
        returns (bool)
    {
        require(
            IData(data_address).getTroopCount(territoryOwned) > 1,
            "You must have at least 1 troop remaining in your territory to attack!"
        );
        require(
            !validate_owner(territoryAttacking),
            "You cannot attack your own territory!"
        ); //checks if the player owns the territory they are trying to attack
        uint8[] memory neighbours = IData(data_address).getNeighbours(
            territoryOwned
        );
        for (uint i = 0; i < 6; i++) {
            if ((territoryAttacking == neighbours[i])) {
                return true;
            }
        }
        return false;
    }

    function getArmies(uint256 attackingArmies, uint256 defendingArmies)
        private
        pure
        returns (uint8)
    {
        uint8 num_words = 0;
        if (attackingArmies == 3) {
            num_words += 3;
        } else if (attackingArmies == 2) {
            num_words += 2;
        } else {
            num_words += 1;
        }
        if (defendingArmies == 2) {
            num_words += 2;
        } else {
            num_words += 1;
        }
        return num_words;
    }

    function add_troop_to_territory(uint index) external onlyMain {
        IData(data_address).addTroopToTerritory(index);
    }

    function get_territory_owner(uint j)
        external
        onlyMain
        returns (uint owner)
    {
        owner = IData(data_address).getTerritoryOwner(j);
        return owner;
    }

    function get_troops_to_deploy() public view returns (uint8) {
        return s_troopsToDeploy;
    }

    function getPlayerTurn() public view returns (address) {
        return s_playersArray[s_playerTurn];
    }
}
