// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/* Errors */
error Raffle__UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 gameState
);
error Lobby__TransferFailed();
error Lobby__SendMoreToEnterLobby();
error Lobby_LobbyNotOpen();

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

    /* State variables */
    // Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Setup Variables
    uint256 private immutable i_interval;
    uint256 private immutable i_entranceFee;
    uint256 private s_lastTimeStamp;
    address private s_recentWinner;
    address payable[] private s_players;
    LobbyState private s_lobbyState;

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
        uint256 interval,
        uint256 entranceFee,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_interval = interval;
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        s_lobbyState = LobbyState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterLobby() public payable {
        require(msg.value >= i_entranceFee, "Not enough value sent");
        require(s_lobbyState == LobbyState.OPEN, "Lobby is full");
        if (msg.value < i_entranceFee) {
            revert Lobby__SendMoreToEnterLobby();
        }
        if (s_lobbyState != LobbyState.OPEN) {
            revert Lobby_LobbyNotOpen();
        }
        // Emit an event when we update an array
        s_players.push(payable(msg.sender));
        emit PlayerJoinedLobby(msg.sender);
        // If players is 4: start game setup
        if (s_players.length == 4) {
            s_lobbyState = LobbyState.CLOSED;
            emit GameStarting();
            requestRandomness();
        }
    }

    function requestRandomness() private {
        require(
            s_lobbyState == LobbyState.CLOSED,
            "Lobby is not full (this should be impossible)"
        );
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
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
        emit ReceivedRandomWords();
        //uint256 indexOfWinner = randomWords[0] % s_players.length;
        //address payable recentWinner = s_players[indexOfWinner];
        //s_recentWinner = recentWinner;
        //s_players = new address payable[](0);
        //s_lobbyState = LobbyState.OPEN;
        //s_lastTimeStamp = block.timestamp;
        //(bool success, ) = recentWinner.call{value: address(this).balance}("");
        // require(success, "Transfer failed");
        //if (!success) {
        //    revert Lobby__TransferFailed();
        //}
        //emit WinnerPicked(recentWinner);
    }

    /** Getter Functions */

    function getGameState() public view returns (LobbyState) {
        return s_lobbyState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
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

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }
}
