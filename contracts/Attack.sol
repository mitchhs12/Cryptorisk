// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";
import "./Main.sol";

contract Attack {
    event Attacking();

    function attack(
        address current_player,
        address payable[] calldata players_array,
        Main.Territory_Info[] calldata current_game
    ) public returns (Main.Territory_Info[] calldata result) {
        emit Attacking();
        current_player = current_player;
        players_array = players_array;
        result = current_game;
        return result;
    }
}
