const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { BytesLike, parseEther } = require("ethers/lib/utils");

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
              console.log(vrfCoordinatorV2Mock.address);
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

          describe("Testing random word generator", function () {
              it("Has 4 players connected and calls the vrf coordinator", async function () {
                  await player1_connection.enterLobby({ value: entranceFee });
                  await player2_connection.enterLobby({ value: entranceFee });
                  await player3_connection.enterLobby({ value: entranceFee });
                  await player4_connection.enterLobby({ value: entranceFee });
                  const txResponse = await setup.callRequestRandomness();
              });
              it("Returns the random words", async function () {
                  const txResponse = await setup.callRequestRandomness();
                  const txReceipt = await txResponse.wait(1);
                  const requestId = txReceipt.events[1].args.requestId;
                  //gasLimit = await setup.getCallbackGasLimit();
                  //console.log(gasLimit, requestId);
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(requestId, setup.address)
                  ).to.emit(setup, "ReceivedRandomWords");
              });
              it("Returns the correct amount of random words", async function () {
                  const txResponse = await setup.callRequestRandomness();
                  const txReceipt = await txResponse.wait(1);
                  const requestId = txReceipt.events[1].args.requestId;
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(requestId, setup.address)
                  ).to.emit(setup, "ReceivedRandomWords");
                  const randomWord = await setup.getRandomWordsArray(0);
                  const randomWord2 = await setup.getRandomWordsArray(1);
                  //const number = randomWord.toNumber() % 4;
                  console.log("NUMBER!:", randomWord.toString());
                  console.log("NUMBER!:", randomWord2.toString());
              });
          });
          // describe("Testing Assign Territory", function () {
          //     it("Distributes the territory properly", async function () {
          //         await setup.testTerritoryAssignment();
          //         const territory1 = await setup.getTerritories(0);
          //     });
          // });
      });
