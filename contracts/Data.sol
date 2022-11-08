// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "hardhat/console.sol";
import "./Controls.sol";

contract Data is IData {
    event ReceivedControls(address indexed controls);

    struct Continent_Info {
        uint8 owner;
        uint8 troopBonus;
    }
    struct Territory_Info {
        uint8 owner;
        uint256 troops;
    }

    enum controlsAddressSent {
        TRUE,
        FALSE
    }
    Continent_Info[6] public s_continents;
    Territory_Info[] public s_territories;
    address private controls_address;
    controlsAddressSent public s_controlsSet;
    // uint8[42][6] public s_neighbours = [
    //     0: [1,3,29],
    //     1: [0,3,4,2],
    //     2: [1,4,5,13],
    //     3: [0,1,4,6],
    //     4: [1,2,3,5,6,7],
    //     5: [2,4,7],
    //     6: [3,4,7,8],
    //     7: [4,5,6,8],
    //     8: [6,7,9],
    //     9: [8,10,11],
    //     10: [9,11,12],
    //     11: [9,10,12,20],
    //     12: [10,11],
    //     13: [2,14,15],
    //     14: [13,15,16,17],
    //     15: [13,14,16,18],
    //     16: [14,15,17,18,19],
    //     17: [14,16,19,26,33,35],
    //     18: [15,16,19,20],
    //     19: [16,17,18,20,21,35],
    //     20: [11,18,19,21,22,23],
    //     21: [19,20,23,35],
    //     22: [20,21,23,24],
    //     23: [20,21,22,24,25,35],
    //     24: [22,23,25],
    //     25: [23,24],
    //     26: [17,27,33,34],
    //     27: [26,28,30,31,34],
    //     28: [27,30,29],
    //     29: [28,30,31,32,0],
    //     30: [27,28,29,31],
    //     31: [29,30,27,34,32],
    //     32: [29,31],
    //     33: [17,26,34,36,35],
    //     34: [31,27,26,33,36,37],
    //     35: [19,17,33,36,23,21],
    //     36: [35,33,34,37],
    //     37: [34,36,38],
    //     38: [37,39,40],
    //     39: [38,41,44],
    //     40: [38,39,41],
    //     41: [40,39],
    // ];

    uint8[][] public s_neighbours = [
        [1, 3, 29, 99, 99, 99],
        [0, 3, 4, 2, 99, 99],
        [1, 4, 5, 13, 99, 99],
        [0, 1, 4, 6, 99, 99],
        [1, 2, 3, 5, 6, 7],
        [2, 4, 7, 99, 99, 99],
        [3, 4, 7, 8, 99, 99],
        [4, 5, 6, 8, 99, 99],
        [6, 7, 9, 99, 99, 99],
        [8, 10, 11, 99, 99, 99],
        [9, 11, 12, 99, 99, 99],
        [9, 10, 12, 20, 99, 99],
        [10, 11, 99, 99, 99, 99],
        [2, 14, 15, 99, 99, 99],
        [13, 15, 16, 17, 99, 99],
        [13, 14, 16, 18, 99, 99],
        [14, 15, 17, 18, 19, 99],
        [14, 16, 19, 26, 33, 35],
        [15, 16, 19, 20, 99, 99],
        [16, 17, 18, 20, 21, 35],
        [11, 18, 19, 21, 22, 23],
        [19, 20, 23, 35, 99, 99],
        [20, 21, 23, 24, 99, 99],
        [20, 21, 22, 24, 25, 35],
        [22, 23, 25, 99, 99, 99],
        [23, 24, 99, 99, 99, 99],
        [17, 27, 33, 34, 99, 99],
        [26, 28, 30, 31, 34, 99],
        [27, 30, 29, 99, 99, 99],
        [28, 30, 31, 32, 0, 99],
        [27, 28, 29, 31, 99, 99],
        [29, 30, 27, 34, 32, 99],
        [29, 31, 99, 99, 99, 99],
        [17, 26, 34, 36, 35, 99],
        [31, 27, 26, 33, 36, 37],
        [19, 17, 33, 36, 23, 21],
        [35, 33, 34, 37, 99, 99],
        [34, 36, 38, 99, 99, 99],
        [37, 39, 40, 99, 99, 99],
        [38, 41, 44, 99, 99, 99],
        [38, 39, 41, 99, 99, 99],
        [40, 39, 99, 99, 99, 99]
    ];

    modifier onlyControls() {
        require(msg.sender == controls_address);
        _;
    }

    constructor() {
        s_controlsSet = controlsAddressSent.FALSE;
    }

    function setControlsAddress(address controls) external {
        require(s_controlsSet == controlsAddressSent.FALSE);
        emit ReceivedControls(controls);
        controls_address = controls;
        s_controlsSet = controlsAddressSent.TRUE;
    }

    // Initializes continents array with owner -1 (indicates no owner), and the troop bonuses of each continent.
    // As player comes to own a contient, owner will be changed to the player.
    function initializeContinents() external onlyControls {
        for (uint8 i = 0; i < 6; i++) {
            s_continents[i].owner = 4; //@dev 0=p1, 1=p2, 2=p3, 3=p4, 4=available
            if (i == 0) {
                // North America
                s_continents[i].troopBonus = 5;
            } else if (i == 1) {
                // South America
                s_continents[i].troopBonus = 2;
            } else if (i == 2) {
                // Europe
                s_continents[i].troopBonus = 5;
            } else if (i == 3) {
                // Africa
                s_continents[i].troopBonus = 3;
            } else if (i == 4) {
                // Asia
                s_continents[i].troopBonus = 7;
            } else if (i == 5) {
                // Oceania
                s_continents[i].troopBonus = 2;
            }
        }
    }

    function updateContinentsLoop(
        uint loopStart,
        uint loopEnd,
        uint8 continent
    ) internal {
        uint8 owner;
        uint8 prevOwner;
        for (uint i = loopStart; i < loopEnd; i++) {
            owner = s_territories[i].owner;
            // if continent owner is not previous owner, the loop will break since owner doesn't own continent
            if (i != loopEnd && owner != prevOwner) {
                s_continents[continent].owner = 4;
                break;
                // if prevOwner == currentOwner, then the owner owns the continent
            } else if (i == loopEnd - 1 && owner == prevOwner) {
                s_continents[continent].owner = owner;
            }
            prevOwner = s_territories[i].owner;
        }
    }

    function updateContinents() external onlyControls {
        // North America
        updateContinentsLoop(0, 9, 0);
        // South America
        updateContinentsLoop(9, 13, 1);
        // Europe
        updateContinentsLoop(13, 20, 2);
        // Africa
        updateContinentsLoop(20, 26, 3);
        // Asia
        updateContinentsLoop(26, 38, 4);
        // Australia
        updateContinentsLoop(38, 42, 5);
    }

    function getAllTerritories() public view returns (Territory_Info[] memory) {
        return s_territories;
    }

    function getTerritories(uint territoryId)
        public
        view
        returns (Territory_Info memory)
    {
        return s_territories[territoryId];
    }

    /* Controls Functions */
    function getContinentBonus(uint continent) external view returns (uint8) {
        return s_continents[continent].troopBonus;
    }

    function getContinentOwner(uint continent) external view returns (uint8) {
        return s_continents[continent].owner;
    }

    function pushToTerritories(uint8 playerAwarded) external onlyControls {
        s_territories.push(Territory_Info(playerAwarded, 1));
    }

    function addTroopToTerritory(uint index) external onlyControls {
        s_territories[index].troops++;
    }

    function getTerritoryOwner(uint j)
        external
        view
        onlyControls
        returns (uint8 owner)
    {
        // console.log("Owner inside data is: ", s_territories[j].owner);
        return s_territories[j].owner;
    }
}
