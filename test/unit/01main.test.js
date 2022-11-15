const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { BytesLike, parseEther } = require("ethers/lib/utils")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Main Unit Tests", async function () {
          let main, vrfCoordinatorV2Mock, entranceFee, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player1 = accounts[1]
              player2 = accounts[2]
              player3 = accounts[3]
              player4 = accounts[4]
              await deployments.fixture(["all"])
              main = await ethers.getContract("Main")
              controls = await ethers.getContract("Controls")
              data = await ethers.getContract("Data")
              await main.setMainAddress()
              player1_connection = main.connect(player1)
              player2_connection = main.connect(player2)
              player3_connection = main.connect(player3)
              player4_connection = main.connect(player4)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              entranceFee = await main.getEntranceFee()
          })

          describe("constructor", function () {
              it("initialises the lobby correctly", async function () {
                  // ideally we make our tests have just one assert per 'it'
                  const lobbyState = await main.getLobbyState()
                  assert.equal(lobbyState.toString(), "0")
              })
              it("Checks the entraceFee is set correctly", async function () {
                  const entranceFee = await main.getEntranceFee()
                  assert.equal(entranceFee.toString(), ethers.utils.parseEther("0.1"))
              })
              it("checks that a player can only enter the lobby once", async function () {
                  const entranceFee = await main.getEntranceFee()
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await expect(player1_connection.enterLobby({ value: entranceFee })).to.be.revertedWith(
                      "You've already entered the game!"
                  )
              })
          })
          describe("enterLobby", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(main.enterLobby()).to.be.revertedWith("Send More to Enter Lobby")
              })
              it("records player1 when they enter", async () => {
                  await player1_connection.enterLobby({ value: entranceFee })
                  const playerFromContract = await player1_connection.getPlayer(0)
                  assert.equal(player1.address, playerFromContract)
              })
              it("records player2 when they enter", async () => {
                  await player1_connection.enterLobby({ value: entranceFee })
                  const playerFromContract = await player1_connection.getPlayer(0)
                  assert.equal(player1.address, playerFromContract)
                  await player2_connection.enterLobby({ value: entranceFee })
                  const playerFromContract2 = await player2_connection.getPlayer(1)
                  assert.equal(player2.address, playerFromContract2)
              })
              it("records player3 when they enter", async () => {
                  await player1_connection.enterLobby({ value: entranceFee })
                  const playerFromContract = await player1_connection.getPlayer(0)
                  assert.equal(player1.address, playerFromContract)
                  await player2_connection.enterLobby({ value: entranceFee })
                  const playerFromContract2 = await player2_connection.getPlayer(1)
                  assert.equal(player2.address, playerFromContract2)
                  await player3_connection.enterLobby({ value: entranceFee })
                  const playerFromContract3 = await player3_connection.getPlayer(2)
                  assert.equal(player3.address, playerFromContract3)
              })
              it("records player4 when they enter", async () => {
                  await player1_connection.enterLobby({ value: entranceFee })
                  const playerFromContract = await player1_connection.getPlayer(0)
                  assert.equal(player1.address, playerFromContract)
                  await player2_connection.enterLobby({ value: entranceFee })
                  const playerFromContract2 = await player2_connection.getPlayer(1)
                  assert.equal(player2.address, playerFromContract2)
                  await player3_connection.enterLobby({ value: entranceFee })
                  const playerFromContract3 = await player3_connection.getPlayer(2)
                  assert.equal(player3.address, playerFromContract3)
                  await player4_connection.enterLobby({ value: entranceFee })
                  const playerFromContract4 = await player4_connection.getPlayer(3)
                  assert.equal(player4.address, playerFromContract4)
              })
              it("returns the correct number of players in the lobby", async () => {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const numberOfPlayers = await main.getNumberOfPlayers()
                  assert.equal(numberOfPlayers.toString(), "3")
              })
              it("emits event on enter", async function () {
                  await expect(main.enterLobby({ value: entranceFee })).to.emit(main, "PlayerJoinedLobby")
              })
              it("doesn't allow new players when the lobby is full", async () => {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  await player4_connection.enterLobby({ value: entranceFee })
                  const lobbyState = await main.getLobbyState()
                  assert.equal(lobbyState.toString(), "1")
              })
          })

          describe("Testing random word generator", function () {
              it("Has 4 players connected and it calls the VRF coordinator", async function () {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const tx = await player4_connection.enterLobby({ value: entranceFee })
                  const receipt = await tx.wait(1)
                  requestId = receipt.events[3].args.requestId
                  assert.equal(requestId.toNumber(), 1)
              })
              it("Returns the random words", async function () {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const tx = await player4_connection.enterLobby({ value: entranceFee })
                  const receipt = await tx.wait(1)
                  requestId = receipt.events[3].args.requestId
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)).to.emit(
                      main,
                      "gotRandomness"
                  )
              })
              it("Returns the correct amount of random words", async function () {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const tx = await player4_connection.enterLobby({ value: entranceFee })
                  const receipt = await tx.wait(1)
                  requestId = receipt.events[3].args.requestId
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)).to.emit(
                      main,
                      "gotRandomness"
                  )
              })
              it("performs upkeep", async function () {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const tx = await player4_connection.enterLobby({ value: entranceFee })
                  const receipt = await tx.wait(1)
                  const requestId = receipt.events[3].args.requestId
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)).to.emit(
                      main,
                      "gotRandomness"
                  )
                  await main.performUpkeep([])
              })
          })
          describe("It assigns the territory correctly", function () {
              it("Calculates and assigns the territory and troops correctly", async function () {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const tx = await player4_connection.enterLobby({ value: entranceFee })
                  const receipt = await tx.wait(1)
                  const requestId = receipt.events[3].args.requestId
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)).to.emit(
                      main,
                      "gotRandomness"
                  )
                  await main.performUpkeep([])
                  let territory
                  let territoriesOwnedBy0 = 0
                  let territoriesOwnerBy1 = 0
                  let territoriesOwnerBy2 = 0
                  let territoriesOwnerBy3 = 0

                  let troopsOwnedBy0 = 0
                  let troopsOwnedBy1 = 0
                  let troopsOwnedBy2 = 0
                  let troopsOwnedBy3 = 0
                  troopTotal = 0
                  for (let i = 0; i < 42; i++) {
                      territory = await data.getTerritories(i)
                      console.log(
                          "Territory",
                          i,
                          "is owned by player",
                          territory.owner,
                          "and has",
                          territory.troops,
                          "troops."
                      )
                      if (territory.owner == 0) {
                          territoriesOwnedBy0++
                          troopsOwnedBy0 = troopsOwnedBy0 + territory.troops
                      } else if (territory.owner == 1) {
                          territoriesOwnerBy1++
                          troopsOwnedBy1 = troopsOwnedBy1 + territory.troops
                      } else if (territory.owner == 2) {
                          territoriesOwnerBy2++
                          troopsOwnedBy2 = troopsOwnedBy2 + territory.troops
                      } else if (territory.owner == 3) {
                          territoriesOwnerBy3++
                          troopsOwnedBy3 = troopsOwnedBy3 + territory.troops
                      }
                  }
                  console.log("Player 0 has", territoriesOwnedBy0, "territories.")
                  console.log("Player 1 has", territoriesOwnerBy1, "territories.")
                  console.log("Player 2 has", territoriesOwnerBy2, "territories.")
                  console.log("Player 3 has", territoriesOwnerBy3, "territories.")
                  assert.equal(troopsOwnedBy0, 30)
                  assert.equal(troopsOwnedBy1, 30)
                  assert.equal(troopsOwnedBy2, 30)
                  assert.equal(troopsOwnedBy3, 30)
              })
          })
          describe("Finished Game Setup", function () {
              it("Emits GameSetupComplete", async function () {
                  await player1_connection.enterLobby({ value: entranceFee })
                  await player2_connection.enterLobby({ value: entranceFee })
                  await player3_connection.enterLobby({ value: entranceFee })
                  const tx = await player4_connection.enterLobby({ value: entranceFee })
                  const receipt = await tx.wait(1)
                  const firstId = receipt.events[3].args.requestId
                  await expect(vrfCoordinatorV2Mock.fulfillRandomWords(requestId, main.address)).to.emit(
                      main,
                      "gotRandomness"
                  )
                  await expect(await main.performUpkeep([])).to.emit(main, "GameSetupComplete")
              })
          })
      })
