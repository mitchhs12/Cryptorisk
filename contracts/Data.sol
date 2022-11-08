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
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     [],
    //     []
    // ];

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
        return s_territories[j].owner;
    }
}
