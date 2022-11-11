// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "hardhat/console.sol";

/**@title Cryptorisk Main Contract
 * @author Michael King and Mitchell Spencer
 * @dev Implements the Chainlink VRF V2
 */

interface IControls {
    function set_players(address payable[] memory) external;

    function push_to_territories(uint8 playerAwarded) external;

    function get_territory_owner(uint256) external returns (uint256);

    function add_troop_to_territory(uint256) external;

    function set_main_address(address main) external;

    function deploy_control(uint8 amountToDeploy, uint8 location) external returns (bool);

    function attack_control(
        uint8 territoryOwned,
        uint8 territoryAttacking,
        uint256 troopQuantity
    ) external;

    function fortify_control(
        uint8 territoryMovingFrom,
        uint8 territoryMovingTo,
        uint256 troopsMoving
    ) external returns (bool);

    function get_troops_to_deploy() external view returns (uint8);

    function getPlayerTurn() external view returns (address);

    function getAttackStatus() external view returns (bool);
}

contract Main is VRFConsumerBaseV2 {
    /* Type declarations */
    enum TerritoryState {
        INCOMPLETE,
        COMPLETE
    }
    enum LobbyState {
        OPEN,
        CLOSED
    }
    enum GameState {
        DEPLOY,
        ATTACK,
        FORTIFY,
        INACTIVE
    }

    enum mainAddressSent {
        TRUE,
        FALSE
    }

    /* Variables */
    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    // Setup Variables
    uint256 private immutable i_entranceFee;
    address private immutable controls_address;
    address private immutable data_address;

    uint8[4] private territoriesAssigned = [0, 0, 0, 0]; // Used to track if player receives enough territory.
    uint256[] s_randomWordsArray;
    TerritoryState public s_territoryState;
    GameState public s_gameState;
    LobbyState public s_lobbyState;
    address payable[] public s_players;
    address public player_turn;
    mainAddressSent public s_mainSet;

    /* Events */
    event RequestedTerritoryRandomness(uint256 indexed requestId);
    event RequestedTroopRandomness(uint256 indexed requestId);
    event ReceivedRandomWords();
    event GameSetupComplete();
    event PlayerJoinedLobby(address indexed player);
    event GameStarting();
    event WinnerSentFunds(address indexed player);
    event MainReset();

    /* Errors */
    error Transfer___Failed();

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint32 callbackGasLimit,
        uint256 entranceFee,
        address controls,
        address data
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        i_entranceFee = entranceFee;
        s_lobbyState = LobbyState.OPEN;
        s_gameState = GameState.INACTIVE;
        s_mainSet = mainAddressSent.FALSE;
        controls_address = controls;
        data_address = data;
    }

    /* Modifiers */

    modifier onlyPlayer() {
        require(msg.sender == IControls(controls_address).getPlayerTurn());
        console.log("player_turn", IControls(controls_address).getPlayerTurn());
        _;
    }

    modifier onlyControls() {
        require(msg.sender == controls_address);
        _;
    }

    /* Functions */

    function enterLobby() public payable {
        require(msg.value >= i_entranceFee, "Send More to Enter Lobby");
        require(s_lobbyState == LobbyState.OPEN, "Lobby is full"); // require or if statement?
        s_players.push(payable(msg.sender));
        emit PlayerJoinedLobby(msg.sender);
        if (s_players.length == 4) {
            s_lobbyState = LobbyState.CLOSED;
            emit GameStarting();
            requestRandomness(42);
        }
    }

    // call this function as soon as contract is deployed
    function setMainAddress() public {
        require(s_mainSet == mainAddressSent.FALSE, "Controls contract has already received Main address");
        IControls(controls_address).set_main_address(address(this));
        s_mainSet = mainAddressSent.TRUE;
    }

    function requestRandomness(uint32 num_words) private {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            num_words
        );
        if (s_territoryState == TerritoryState.COMPLETE) {
            emit RequestedTroopRandomness(requestId);
        } else {
            emit RequestedTerritoryRandomness(requestId);
        }
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        s_randomWordsArray = randomWords;
        emit ReceivedRandomWords();
        if (s_territoryState == TerritoryState.INCOMPLETE) {
            assignTerritory(randomWords);
        } else {
            assignTroops(randomWords);
        }
    }

    /**
     * Function receives array of 42 random words which are then used to assign each territory (0-41) an owner (0-3).
     * Mutates a globally declared array s_territories.
     */
    function assignTerritory(uint256[] memory randomWords) private {
        uint8[4] memory playerSelection = [0, 1, 2, 3]; // Eligible players to be assigned territory, each is popped until no players left to receive.
        uint8 territoryCap = 10; // Initial cap is 10, moves up to 11 after two players assigned 10.
        uint8 remainingPlayers = 4; // Ticks down as players hit their territory cap
        uint256 indexAssignedTerritory; // Index of playerSelection that contains a list of eligible players to receive territory.
        uint8 playerAwarded; // Stores the player to be awarded territory, for pushing into the s_territories array.'
        for (uint256 i = 0; i < randomWords.length; i++) {
            indexAssignedTerritory = randomWords[i] % remainingPlayers; // Calculates which index from playerSelection will receive the territory
            playerAwarded = playerSelection[indexAssignedTerritory]; // Player to be awarded territory
            IControls(controls_address).push_to_territories(playerAwarded);
            territoriesAssigned[playerAwarded]++;
            if (territoriesAssigned[playerAwarded] == territoryCap) {
                delete playerSelection[playerAwarded]; // Removes awarded player from the array upon hitting territory cap.
                remainingPlayers--;
                if (remainingPlayers == 2) {
                    territoryCap = 11; // Moves up instead of down, to remove situation where the cap goes down and we have players already on the cap then receiving too much territory.
                }
            }
        }
        s_territoryState = TerritoryState.COMPLETE;
        requestRandomness(78);
    }

    function assignTroops(uint256[] memory randomWords) private {
        uint256 randomWordsIndex = 0;
        // s_territories.length == 42
        // playerTerritoryIndexes.length == 10 or 11
        for (uint256 i = 0; i < 4; i++) {
            uint256[] memory playerTerritoryIndexes = new uint256[](territoriesAssigned[i]); // Initializes array of indexes for territories owned by player i
            uint256 index = 0;
            for (uint256 j = 0; j < 42; j++) {
                if (IControls(controls_address).get_territory_owner(j) == i) {
                    playerTerritoryIndexes[index++] = j;
                }
            }

            for (uint256 j = 0; j < 30 - territoriesAssigned[i]; j++) {
                uint256 territoryAssignedTroop = randomWords[randomWordsIndex++] % territoriesAssigned[i];
                IControls(controls_address).add_troop_to_territory(playerTerritoryIndexes[territoryAssignedTroop]);
            }
        }
        emit GameSetupComplete();
        s_gameState = GameState.DEPLOY;
        IControls(controls_address).set_players(s_players);
    }

    function deploy(uint8 amountToDeploy, uint8 location) public onlyPlayer {
        console.log("deploying");
        require(s_gameState == GameState.DEPLOY, "It is currently not deploy phase!");
        console.log("at end of deploy function");
        require(
            amountToDeploy <= IControls(controls_address).get_troops_to_deploy(),
            "You do not have that many troops to deploy!"
        );
        console.log("at end of deploy function");
        bool troopsLeft = IControls(controls_address).deploy_control(amountToDeploy, location);
        console.log("at end of deploy function");
        if (troopsLeft == false) {
            s_gameState = GameState.ATTACK;
        }
    }

    function attack(
        uint8 territoryOwned,
        uint8 territoryAttacking,
        uint256 troopQuantity
    ) public onlyPlayer {
        require(IControls(controls_address).getAttackStatus() == false);
        require(s_gameState == GameState.ATTACK, "It is currently not attack phase!");
        IControls(controls_address).attack_control(territoryOwned, territoryAttacking, troopQuantity);
    }

    // player clicks this button when they have finished attacking
    function finishAttack() public onlyPlayer {
        require(IControls(controls_address).getAttackStatus() == false);
        s_gameState = GameState.FORTIFY;
    }

    function fortify(
        uint8 territoryMovingFrom,
        uint8 territoryMovingTo,
        uint256 troopsMoving
    ) public onlyPlayer {
        console.log("inside main");
        require(s_gameState == GameState.FORTIFY, "It is currently not fortify phase!");
        console.log("here");
        require(
            IControls(controls_address).fortify_control(territoryMovingFrom, territoryMovingTo, troopsMoving) == true,
            "Your fortification attempt failed"
        );
        s_gameState = GameState.DEPLOY;
    }

    function payWinner(address winner) public onlyControls returns (bool) {
        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) {
            revert Transfer___Failed();
        }
        emit WinnerSentFunds(winner);
        resetMain();
        return success;
    }

    /** Getter Functions */

    function getRandomWordsArray() public view returns (uint256[] memory) {
        return s_randomWordsArray;
    }

    function getRandomWordsArrayIndex(uint256 index) public view returns (uint256) {
        return s_randomWordsArray[index];
    }

    function getSubscriptionId() public view returns (uint64) {
        return i_subscriptionId;
    }

    function getGasLane() public view returns (bytes32) {
        return i_gasLane;
    }

    function getCallbackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getTerritoryState() public view returns (TerritoryState) {
        return s_territoryState;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getLobbyState() public view returns (LobbyState) {
        return s_lobbyState;
    }

    // Resets everything
    function resetMain() internal {
        s_lobbyState = LobbyState.OPEN;
        s_players = new address payable[](0);
        s_gameState = GameState.INACTIVE;
        territoriesAssigned = [0, 0, 0, 0];
        emit MainReset();
    }
}
