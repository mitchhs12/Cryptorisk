// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "hardhat/console.sol";
/* Errors */
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 gameState
);
error Lobby__TransferFailed();

/**@title A sample Raffle Contract
 * @author Mitchell Spencer
 * @notice Cryptorisk setup contract.
 * @dev Implements the Chainlink VRF V2
 */

contract Setup is VRFConsumerBaseV2 {
    /* Type declarations */
    enum LobbyState {
        OPEN,
        CLOSED
    }
    enum TerritoryState {
        INCOMPLETE,
        COMPLETE
    }
    enum SetupState {
        INCOMPLETE,
        COMPLETE
    }
    enum VRFState {
        OPEN,
        CALLED
    }

    // enum Territory {
    //     Alaska,
    //     NorthwestTerritory,
    //     Greenland,
    //     Quebec,
    //     Ontario,
    //     Alberta,
    //     WesternUS,
    //     EasternUS,
    //     CentralAmerica,
    //     Venezuela,
    //     Peru,
    //     Argentina,
    //     Brazil,
    //     Iceland,
    //     GreatBritain,
    //     WesternEurope,
    //     SouthernEurope,
    //     NorthernEurope,
    //     Scandinavia,
    //     Ukraine,
    //     NorthAfrica,
    //     Egypt,
    //     EastAfrica,
    //     Congo,
    //     SouthAfrica,
    //     Madagascar,
    //     MiddleEast,
    //     Afghanistan,
    //     Ural,
    //     Siberia,
    //     Yakutsk,
    //     Kamchatka,
    //     Irkutsk,
    //     Mongolia,
    //     Japan,
    //     China,
    //     India,
    //     Siam,
    //     Indonesia,
    //     NewGuinea,
    //     WesternAustralia,
    //     EasternAustralia
    // }
    /* State variables */
    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    // Setup Variables
    uint256[] s_randomWordsArray;
    uint256 private immutable i_entranceFee;
    uint256 private s_lastTimeStamp;
    address private s_recentWinner;
    address payable[] private s_players;
    VRFState private s_vrfState;
    LobbyState private s_lobbyState;
    TerritoryState private s_territoryState;
    SetupState private s_setupState;
    Territory_Info[] private s_territories;

    uint8[4] private territoriesAssigned = [0, 0, 0, 0]; // Used to track if player receives enough territory.

    struct Territory_Info {
        uint owner;
        uint256 troops;
    }

    /* Events */
    event RequestedRandomness(uint256 indexed requestId);
    event PlayerJoinedLobby(address indexed player);
    event WinnerPicked(address indexed player);
    event GameStarting();
    event ReceivedRandomWords();

    /* Functions */
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane, // keyHash
        uint256 entranceFee,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_entranceFee = entranceFee;
        i_callbackGasLimit = callbackGasLimit;
        s_lobbyState = LobbyState.OPEN;
        s_lastTimeStamp = block.timestamp;
        s_vrfState = VRFState.OPEN;
    }

    function enterLobby() public payable {
        require(msg.value >= i_entranceFee, "Send More to Enter Lobby");
        require(s_lobbyState == LobbyState.OPEN, "Lobby is full"); // require or if statement?
        // Emit an event when we update an array
        s_players.push(payable(msg.sender));
        emit PlayerJoinedLobby(msg.sender);
        if (s_players.length == 4) {
            s_lobbyState = LobbyState.CLOSED;
            emit GameStarting();
            requestRandomness(42);
        }
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

    /**
     * @dev This is the function that Chainlink VRF node
     * calls to send the money to the random winner.
     */

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        console.log("sol: randomWords received!");
        s_randomWordsArray = randomWords;
        emit ReceivedRandomWords();
        if (s_territoryState == TerritoryState.INCOMPLETE) {
            assignTerritory(randomWords);
        }
        //assignTroops(randomWords);
    }

    /**
     * Function receives array of 42 random words which are then used to assign each territory (0-41) an owner (0-3).
     * Mutates a globally declared array s_territories.
     */
    function assignTerritory(uint256[] memory randomWords) private {
        randomWords;
        console.log("Beginning territory assignment:");
        // uint8[4] memory playerSelection = [0, 1, 2, 3]; // Eligible players to be assigned territory, each is popped until no players left to receive.
        // uint8 territoryCap = 10; // Initial cap is 10, moves up to 11 after two players assigned 10.
        // uint8 remainingPlayers = 4; // Ticks down as players hit their territory cap
        // uint256 indexAssignedTerritory; // Index of playerSelection that contains a list of eligible players to receive territory.
        // uint8 playerAwarded; // Stores the player to be awarded territory, for pushing into the s_territories array.
        // for (uint i = 0; i < randomWords.length; i++) {
        //     indexAssignedTerritory = randomWords[i] % remainingPlayers; // Calculates which index from playerSelection will receive the territory
        //     playerAwarded = playerSelection[indexAssignedTerritory]; // Player to be awarded territory
        //     s_territories.push(Territory_Info(playerAwarded, 1));
        //     territoriesAssigned[playerAwarded]++;
        //     if (territoriesAssigned[playerAwarded] == territoryCap) {
        //         delete playerSelection[playerAwarded]; // Removes awarded player from the array upon hitting territory cap.
        //         remainingPlayers--;
        //         if (remainingPlayers == 2) {
        //             territoryCap = 11; // Moves up instead of down, to remove situation where the cap goes down and we have players already on the cap then receiving too much territory.
        //         }
        //     }
        // }
        s_territoryState = TerritoryState.COMPLETE;
        //requestRandomness(78);
    }

    function assignTroops(uint256[] memory randomWords) private {
        uint randomWordsIndex = 0;
        // s_territories.length == 42
        // playerTerritoryIndexes.length == 10 or 11
        for (uint i = 0; i < 4; i++) {
            uint[] memory playerTerritoryIndexes = new uint[](
                territoriesAssigned[i]
            ); // Initializes array of indexes for territories owned by player i
            uint index = 0;
            for (uint j = 0; j < s_territories.length; i++) {
                if (s_territories[j].owner == i) {
                    playerTerritoryIndexes[index++] = j;
                }
            }
            for (uint j = 0; j < 30 - territoriesAssigned[i]; j++) {
                uint territoryAssignedTroop = randomWords[randomWordsIndex++] %
                    territoriesAssigned[i];
                s_territories[playerTerritoryIndexes[territoryAssignedTroop]]
                    .troops++;
            }
        }
    }

    /** Tester Functions */
    function testTerritoryAssignment() external {
        assignTerritory(s_randomWordsArray);
    }

    /** Getter Functions */

    function getRandomWordsArray() public view returns (uint256[] memory) {
        return s_randomWordsArray;
    }

    function getRandomWordsArrayIndex(uint256 index)
        public
        view
        returns (uint256)
    {
        return s_randomWordsArray[index];
    }

    function getSubscriptionId() public view returns (uint64) {
        return i_subscriptionId;
    }

    function getGasLane() public view returns (bytes32) {
        return i_gasLane;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getCallbackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getLobbyState() public view returns (LobbyState) {
        return s_lobbyState;
    }

    function getTerritoryState() public view returns (TerritoryState) {
        return s_territoryState;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getTerritories(uint territoryId)
        public
        view
        returns (Territory_Info memory)
    {
        return s_territories[territoryId];
    }
}
