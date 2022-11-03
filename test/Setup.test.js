const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Setup Unit Tests", function () {
          let setup, setupContract, vrfCoordinatorV2Mock, entranceFee, interval, player; // , deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners(); // could also do with getNamedAccounts
              deployer = accounts[0];
              player = accounts[1];
              await deployments.fixture(["mocks", "setup"]); // Deploys modules with the tags "mocks" and "setup"
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock"); // Returns a new connection to the VRFCoordinatorV2Mock contract
              setupContract = await ethers.getContract("Setup"); // Returns a new connection to the Setup contract
              setup = setupContract.connect(player); // Returns a new instance of the Setup contract connected to player
              entranceFee = await setup.getEntranceFee();
              interval = await setup.getInterval();
          });

          describe("constructor", function () {
              it("initializes the setup contract correctly", async () => {
                  // Ideally, we'd separate these out so that only 1 assert per "it" block
                  // And ideally, we'd make this check everything
                  const gameState = (await setup.getGameState()).toString();
                  // Comparisons for Raffle initialization:
                  assert.equal(gameState, "0");
              });
          });

          describe("enterLobby", function () {
              it("reverts when you don't pay enough", async () => {
                  await expect(setup.enterRaffle()).to.be.revertedWith(
                      // is reverted when not paid enough or raffle is not open
                      "Raffle__SendMoreToEnterRaffle"
                  );
              });
              it("records player when they enter", async () => {
                  await setup.enterRaffle({ value: entranceFee });
                  const contractPlayer = await setup.getPlayer(0);
                  assert.equal(player.address, contractPlayer);
              });

              it("emits event on enter", async () => {
                  await expect(setup.enterRaffle({ value: entranceFee })).to.emit(
                      // emits RaffleEnter event if entered to index player(s) address
                      setup,
                      "RaffleEnter"
                  );
              });
              it("doesn't allow entrance when raffle is calculating", async () => {
                  await setup.enterRaffle({ value: entranceFee });
                  // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  // we pretend to be a keeper for a second
                  await setup.performUpkeep([]); // changes the state to calculating for our comparison below
                  await expect(setup.enterRaffle({ value: entranceFee })).to.be.revertedWith(
                      // is reverted as raffle is calculating
                      "Raffle__RaffleNotOpen"
                  );
              });
          });
          it("returns false if raffle isn't open", async () => {
              await setup.enterRaffle({ value: entranceFee });
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
              await network.provider.request({ method: "evm_mine", params: [] });
              await setup.performUpkeep([]); // changes the state to calculating
              const gameState = await setup.getGameState(); // stores the new state
              const { upkeepNeeded } = await setup.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert.equal(gameState.toString() == "1", upkeepNeeded == false);
          });
          it("returns false if enough time hasn't passed", async () => {
              await setup.setupRaffle({ value: ntranceFee });
              await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]); // use a higher number here if this test fails
              await network.provider.request({ method: "evm_mine", params: [] });
              const { upkeepNeeded } = await setup.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(!upkeepNeeded);
          });
          it("returns true if enough time has passed, has players, eth, and is open", async () => {
              await setup.enterLobby({ value: entranceFee });
              await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
              await network.provider.request({ method: "evm_mine", params: [] });
              const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(upkeepNeeded);
          });
      });

describe("performUpkeep", function () {
    it("can only run if checkupkeep is true", async () => {
        await setup.enterLobby({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const tx = await setup.performUpkeep("0x");
        assert(tx);
    });
    it("reverts if checkup is false", async () => {
        await expect(setup.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded");
    });
    it("updates the raffle state and emits a requestId", async () => {
        // Too many asserts in this test!
        await setup.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const txResponse = await raffle.performUpkeep("0x"); // emits requestId
        const txReceipt = await txResponse.wait(1); // waits 1 block
        const gameState = await setup.getGameState(); // updates state
        const requestId = txReceipt.events[1].args.requestId;
        assert(requestId.toNumber() > 0);
        assert(gameState == 1); // 0 = open, 1 = calculating
    });
});
describe("fulfillRandomWords", function () {
    beforeEach(async () => {
        await setup.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.request({ method: "evm_mine", params: [] });
    });
    it("can only be called after performupkeep", async () => {
        await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, setup.address) // reverts if not fulfilled
        ).to.be.revertedWith("nonexistent request");
        await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, setup.address) // reverts if not fulfilled
        ).to.be.revertedWith("nonexistent request");
    });

    // This test is too big...
    // This test simulates users entering the raffle and wraps the entire functionality of the raffle
    // inside a promise that will resolve if everything is successful.
    // An event listener for the WinnerPicked is set up
    // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
    // All the assertions are done once the WinnerPicked event is fired
    it("picks a winner, resets, and sends money", async () => {
        const additionalEntrances = 3; // to test
        const startingIndex = 2;
        for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
            // i = 2; i < 5; i=i+1
            setup = setupContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
            await setup.enterLobby({ value: entranceFee });
        }
        const startingTimeStamp = await setup.getLastTimeStamp(); // stores starting timestamp (before we fire our event)

        // This will be more important for our staging tests...
        await new Promise(async (resolve, reject) => {
            setup.once("WinnerPicked", async () => {
                // event listener for WinnerPicked
                console.log("WinnerPicked event fired!");
                // assert throws an error if it fails, so we need to wrap
                // it in a try/catch so that the promise returns event
                // if it fails.
                try {
                    // Now lets get the ending values...
                    const recentWinner = await setup.getRecentWinner();
                    const setupState = await setup.getGameState();
                    const winnerBalance = await accounts[2].getBalance();
                    const endingTimeStamp = await setup.getLastTimeStamp();
                    await expect(setup.getPlayer(0)).to.be.reverted;
                    // Comparisons to check if our ending values are correct:
                    assert.equal(recentWinner.toString(), accounts[2].address);
                    assert.equal(gameState, 0);
                    assert.equal(
                        winnerBalance.toString(),
                        startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                            .add(entranceFee.mul(additionalEntrances).add(entranceFee))
                            .toString()
                    );
                    assert(endingTimeStamp > startingTimeStamp);
                    resolve(); // if try passes, resolves the promise
                } catch (e) {
                    reject(e); // if try fails, rejects the promise
                }
            });

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            const tx = await setup.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const startingBalance = await accounts[2].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events[1].args.requestId,
                setup.address
            );
        });
    });
});
