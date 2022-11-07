const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { BytesLike, parseEther } = require("ethers/lib/utils");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Main Unit Tests", async function () {
          let main, vrfCoordinatorV2Mock, entranceFee, deployer;

          beforeEach(async () => {
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              player1 = accounts[1];
              player2 = accounts[2];
              player3 = accounts[3];
              player4 = accounts[4];
              await deployments.fixture(["all"]);
              main = await ethers.getContract("Main");
              player1_connection = main.connect(player1);
              player2_connection = main.connect(player2);
              player3_connection = main.connect(player3);
              player4_connection = main.connect(player4);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              entranceFee = await main.getEntranceFee();
          });

          describe("constructor", function () {
              it("initialises the lobby correctly", async function () {
                  // ideally we make our tests have just one assert per 'it'
                  const lobbyState = await main.getLobbyState();
                  assert.equal(lobbyState.toString(), "0");
              });
          });
          describe("enterLobby", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(main.enterLobby()).to.be.revertedWith("Send More to Enter Lobby");
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
                  const numberOfPlayers = await main.getNumberOfPlayers();
                  assert.equal(numberOfPlayers.toString(), "3");
              });
              it("emits event on enter", async function () {
                  await expect(main.enterLobby({ value: entranceFee })).to.emit(
                      main,
                      "PlayerJoinedLobby"
                  );
              });
              it("doesn't allow new players when the lobby is full", async () => {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  await player4_connection.enterLobby({ value: entranceFee });
                  const lobbyState = await main.getLobbyState();
                  assert.equal(lobbyState.toString(), "1");
              });
          });

          describe("Testing random word generator", function () {
              it("Has 4 players connected and it calls the VRF coordinator", async function () {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  const tx = await player4_connection.enterLobby({ value: entranceFee });
                  const receipt = await tx.wait(1);
                  requestId = receipt.events[3].args.requestId;
                  assert.equal(requestId.toNumber(), 1);
              });
              it("Returns the random words", async function () {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  const tx = await player4_connection.enterLobby({ value: entranceFee });
                  const receipt = await tx.wait(1);
                  requestId = receipt.events[3].args.requestId;
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)
                  ).to.emit(main, "ReceivedRandomWords");
              });
              it("Returns the correct amount of random words", async function () {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  const tx = await player4_connection.enterLobby({ value: entranceFee });
                  const receipt = await tx.wait(1);
                  requestId = receipt.events[3].args.requestId;
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)
                  ).to.emit(main, "ReceivedRandomWords");
                  const randomWord0 = await main.getRandomWordsArrayIndex(0);
                  const randomWord41 = await main.getRandomWordsArrayIndex(41);
                  await expect(main.getRandomWordsArrayIndex(42)).to.be.reverted;
                  console.log("First random word:", randomWord0.toString());
                  console.log("Last random word:", randomWord41.toString());
              });
          });
          describe("It assigns the territory correctly", function () {
              it("Calculates and assigns the territory and troops correctly", async function () {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  const tx = await player4_connection.enterLobby({ value: entranceFee });
                  const receipt = await tx.wait(1);
                  const firstId = receipt.events[3].args.requestId;
                  const tx2 = await vrfCoordinatorV2Mock.fulfillRandomWords(firstId, main.address);
                  const receipt2 = await tx2.wait(1);
                  const secondId = receipt2.events[1].args.requestId;
                  const tx3 = await vrfCoordinatorV2Mock.fulfillRandomWords(secondId, main.address);
                  let territory;
                  let territoriesOwnerBy0 = 0;
                  let territoriesOwnerBy1 = 0;
                  let territoriesOwnerBy2 = 0;
                  let territoriesOwnerBy3 = 0;

                  let troopsOwnedBy0 = 0;
                  let troopsOwnedBy1 = 0;
                  let troopsOwnedBy2 = 0;
                  let troopsOwnedBy3 = 0;
                  for (let i = 0; i < 42; i++) {
                      territory = await main.getTerritories(i);
                      console.log(
                          "Territory",
                          i,
                          "is owned by player",
                          territory.owner.toNumber(),
                          "and has",
                          territory.troops.toNumber(),
                          "troops."
                      );
                      if (territory.owner.toNumber() == 0) {
                          territoriesOwnerBy0++;
                          troopsOwnedBy0 = troopsOwnedBy0 + territory.troops.toNumber();
                      } else if (territory.owner.toNumber() == 1) {
                          territoriesOwnerBy1++;
                          troopsOwnedBy1 = troopsOwnedBy1 + territory.troops.toNumber();
                      } else if (territory.owner.toNumber() == 2) {
                          territoriesOwnerBy2++;
                          troopsOwnedBy2 = troopsOwnedBy2 + territory.troops.toNumber();
                      } else if (territory.owner.toNumber() == 3) {
                          territoriesOwnerBy3++;
                          troopsOwnedBy3 = troopsOwnedBy3 + territory.troops.toNumber();
                      }
                  }
                  console.log("Player 0 has", territoriesOwnerBy0, "territories.");
                  console.log("Player 1 has", territoriesOwnerBy1, "territories.");
                  console.log("Player 2 has", territoriesOwnerBy2, "territories.");
                  console.log("Player 3 has", territoriesOwnerBy3, "territories.");
                  assert.equal(troopsOwnedBy0, 30);
                  assert.equal(troopsOwnedBy1, 30);
                  assert.equal(troopsOwnedBy2, 30);
                  assert.equal(troopsOwnedBy3, 30);
              });
          });
          describe("Finished Game Setup", function () {
              it("Emits GameSetupComplete", async function () {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  const tx = await player4_connection.enterLobby({ value: entranceFee });
                  const receipt = await tx.wait(1);
                  const firstId = receipt.events[3].args.requestId;
                  const tx2 = await vrfCoordinatorV2Mock.fulfillRandomWords(firstId, main.address);
                  const receipt2 = await tx2.wait(1);
                  const secondId = receipt2.events[1].args.requestId;
                  await expect(
                      await vrfCoordinatorV2Mock.fulfillRandomWords(secondId, main.address)
                  ).to.emit(main, "GameSetupComplete");
              });
          });
      });
