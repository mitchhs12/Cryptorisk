const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Setup Unit Tests", async function () {
          let setup, vrfCoordinatorV2Mock, entranceFee, deployer;

          beforeEach(async () => {
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              player1 = accounts[1];
              player2 = accounts[2];
              player3 = accounts[3];
              player4 = accounts[4];
              await deployments.fixture(["all"]);
              setup = await ethers.getContract("Setup");
              player1_connection = setup.connect(player1);
              player2_connection = setup.connect(player2);
              player3_connection = setup.connect(player3);
              player4_connection = setup.connect(player4);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              entranceFee = await setup.getEntranceFee();
          });

          describe("constructor", function () {
              it("initialises the lobby correctly", async function () {
                  // ideally we make our tests have just one assert per 'it'
                  const lobbyState = await setup.getLobbyState();
                  assert.equal(lobbyState.toString(), "0");
              });
          });
          describe("enterLobby", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(setup.enterLobby()).to.be.revertedWith("Send More to Enter Lobby");
              });
              it("records player1 when they enter", async () => {
                  await player1_connection.enterLobby({ value: entranceFee });
                  const playerFromContract = await player1_connection.getPlayer(0);
                  assert.equal(player1.address, playerFromContract);
              });
              it("records player2 when they enter", async () => {
                  await player2_connection.enterLobby({ value: entranceFee });
                  const playerFromContract = await player2_connection.getPlayer(0);
                  assert.equal(player2.address, playerFromContract);
              });
              it("returns the correct number of players in the lobby", async () => {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  const numberOfPlayers = await setup.getNumberOfPlayers();
                  assert.equal(numberOfPlayers.toString(), "3");
              });
              it("emits event on enter", async function () {
                  await expect(setup.enterLobby({ value: entranceFee })).to.emit(
                      setup,
                      "PlayerJoinedLobby"
                  );
              });
              it("doesn't allow new players when the lobby is full", async () => {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  await player4_connection.enterLobby({ value: entranceFee });
                  const lobbyState = await setup.getLobbyState();
                  assert.equal(lobbyState.toString(), "1");
              });
          });

          describe("testingvrf", function () {
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, setup.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, setup.address)
                  ).to.be.revertedWith("nonexistent request");
                  const tx = await setup.performUpkeep([]);
                  const txReceipt = await tx.wait(1);
                  const winnerStartingBalance = await accounts[1].getBalance();
                  await vrfCoordinatorV2Mock.fulfillRandomWords(
                      txReceipt.events[1].args.requestId,
                      setup.address
                  );
              });
          });

          describe("fulfillRandomWords", function () {
              this.beforeEach(async function () {
                  await setup.enterRaffle({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
              });
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request");
              });
              // GARGANTUAN TEST
              it("picks a winner, resets the lottery, and sends the money", async function () {
                  const additionalEntrants = 3;
                  const startingAccountIndex = 1; //since deployer = 0
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(accounts[i]);
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee });
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp();

                  // performUpkeep (mock being the chainlink keepers)
                  // will kick off fulfillRandomWords (mock being the chainlink vrf)
                  // we will have to wait for the fulfillRandomWords to be called
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("found the event!");
                          try {
                              const recentWinner = await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp = await raffle.getLatestTimeStamp();
                              const numPlayers = await raffle.getNumberOfPlayers();
                              const winnerEndingBalance = await accounts[1].getBalance();
                              console.log(recentWinner);
                              console.log(accounts[2].address);
                              console.log(accounts[0].address);
                              console.log(accounts[1].address);
                              console.log(accounts[3].address);
                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);

                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(
                                      raffleEntranceFee
                                          .mul(additionalEntrants)
                                          .add(raffleEntranceFee)
                                          .toString()
                                  )
                              );
                          } catch (e) {
                              reject(e);
                          }
                          resolve();
                      });
                      // setting up the listener
                      // below, we will fire the event, and the listener will pick it up and resolve.
                      const tx = await raffle.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      const winnerStartingBalance = await accounts[1].getBalance();
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          raffle.address
                      );
                  });
              });
          });
      });
