// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "hardhat/console.sol";
import "./Setup.sol";
import "./Deploy.sol";
import "./Attack.sol";
import "./Fortify.sol";

abstract contract Cryptorisk is Setup {
    LobbyState private s_lobbyState;
    Territory_Info[] private s_territories;
    address payable[] private s_players;
    uint256 private immutable i_entranceFee;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
        s_lobbyState = LobbyState.OPEN;
    }

    function enterLobby() public payable {
        require(msg.value >= i_entranceFee, "Send More to Enter Lobby");
        require(s_lobbyState == LobbyState.OPEN, "Lobby is full"); // require or if statement?
        s_players.push(payable(msg.sender));
        emit PlayerJoinedLobby(msg.sender);
        if (s_players.length == 4) {
            s_lobbyState = LobbyState.CLOSED;
            emit GameStarting();
            Setup.startSetup();
            s_territories = Setup.getAllTerritories();
        }
    }

    // // Setup setupContract;
    // // Attack attackContract;
    // // Fortify fortifyContract;
    // // Deploy deployContract;
    // struct Territory_Info {
    //     uint owner;
    //     uint256 troops;
    // }
    // uint256 private immutable i_entranceFee;
    // address payable[] private s_players;

    // event PlayerJoinedLobby(address indexed player);
    // event GameStarting();

    // function main() internal {}

    // function enterLobby() public payable {
    //     require(msg.value >= i_entranceFee, "Send More to Enter Lobby");
    //     require(s_lobbyState == LobbyState.OPEN, "Lobby is full");
    //     // Emit an event when we update an array
    //     s_players.push(payable(msg.sender));
    //     // emit PlayerJoinedLobby(msg.sender);
    //     // s_lobbyState = setupContract.startSetup(s_players);
    // }

    // function getInitialTerritories() public returns (uint) {
    //     return 1;
    // }

    // function getPlayer(uint256 index) public view returns (address) {
    //     return s_players[index];
    // }

    // function getNumberOfPlayers() public view returns (uint256) {
    //     return s_players.length;
    // }
    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }
}
