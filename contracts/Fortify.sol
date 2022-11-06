// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";

contract Fortify {
    function fortify() public pure returns (uint256) {
        uint a = 1;
        uint b = 2;
        uint result = a + b;
        return result;
    }
}
