// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Controls.sol";
import "hardhat/console.sol";

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
    Territory_Info[42] public s_territories;
    address private controls_address;
    controlsAddressSent public s_controlsSet;

    // Array containing territories that are neighbours of the territory of the index. 99 is a filler.
    uint8[][] public s_neighbours = [
        [1, 3, 29, 99, 99, 99], //0
        [0, 3, 4, 2, 99, 99],
        [1, 4, 5, 13, 99, 99],
        [0, 1, 4, 6, 99, 99],
        [1, 2, 3, 5, 6, 7],
        [2, 4, 7, 99, 99, 99],
        [3, 4, 7, 8, 99, 99],
        [4, 5, 6, 8, 99, 99],
        [6, 7, 9, 99, 99, 99],
        [8, 10, 11, 99, 99, 99],
        [9, 11, 12, 99, 99, 99], //10
        [9, 10, 12, 20, 99, 99],
        [10, 11, 99, 99, 99, 99],
        [2, 14, 15, 99, 99, 99],
        [13, 15, 16, 17, 99, 99],
        [13, 14, 16, 18, 99, 99],
        [14, 15, 17, 18, 19, 99],
        [14, 16, 19, 26, 33, 35],
        [15, 16, 19, 20, 99, 99],
        [16, 17, 18, 20, 21, 35],
        [11, 18, 19, 21, 22, 23], //20
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

    function setControlsAddress(address controls) external override {
        require(s_controlsSet == controlsAddressSent.FALSE);
        emit ReceivedControls(controls);
        controls_address = controls;
        s_controlsSet = controlsAddressSent.TRUE;
    }

    // Initializes continents array with owner -1 (indicates no owner), and the troop bonuses of each continent.
    // As player comes to own a contient, owner will be changed to the player.
    function initializeContinents() external override onlyControls {
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
        uint256 loopStart,
        uint256 loopEnd,
        uint8 continent
    ) internal {
        uint8 owner;
        uint8 prevOwner;
        for (uint256 i = loopStart; i < loopEnd; i++) {
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

    function updateContinents() external override onlyControls {
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

    function getAllTerritories() public view returns (Territory_Info[42] memory) {
        return s_territories;
    }

    function getTerritories(uint256 territoryId) public view returns (Territory_Info memory) {
        return s_territories[territoryId];
    }

    /* Controls Functions */
    function getContinentBonus(uint256 continent) external view override returns (uint8) {
        return s_continents[continent].troopBonus;
    }

    function getContinentOwner(uint256 continent) external view override returns (uint8) {
        return s_continents[continent].owner;
    }

    function getContinentInfo() public view returns (Continent_Info[6] memory) {
        return s_continents;
    }

    function pushToTerritories(uint256 territory, uint8 playerAwarded) external onlyControls {
        s_territories[territory].owner = playerAwarded;
        s_territories[territory].troops = 1;
    }

    function addTroopToTerritory(uint256 index) external override onlyControls {
        ++s_territories[index].troops;
    }

    function removeTroopFromTerritory(uint256 index) external override onlyControls {
        s_territories[index].troops--;
    }

    function getNeighbours(uint256 territory) external view override onlyControls returns (uint8[] memory) {
        return s_neighbours[territory];
    }

    function getTerritoryOwner(uint256 j) public view override returns (uint8 owner) {
        return s_territories[j].owner;
    }

    function getTroopCount(uint256 territory) public view override returns (uint256) {
        return s_territories[territory].troops;
    }

    function changeOwner(uint256 territory, uint8 newOwner) external override onlyControls {
        s_territories[territory].owner = newOwner;
    }

    function resetData() external override onlyControls {
        delete s_territories;
    }
}
