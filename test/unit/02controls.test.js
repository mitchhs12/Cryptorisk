const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { BytesLike, parseEther } = require("ethers/lib/utils")
const { Contract } = require("ethers")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Controls Unit Tests", async function () {
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
              await player1_connection.enterLobby({ value: entranceFee })
              await player2_connection.enterLobby({ value: entranceFee })
              await player3_connection.enterLobby({ value: entranceFee })
              const tx = await player4_connection.enterLobby({ value: entranceFee })
              const receipt = await tx.wait(1)
              const firstId = receipt.events[3].args.requestId
              const tx2 = await vrfCoordinatorV2Mock.fulfillRandomWords(firstId, main.address)
              const receipt2 = await tx2.wait(1)
              const secondId = receipt2.events[1].args.requestId
              await vrfCoordinatorV2Mock.fulfillRandomWords(secondId, main.address)
          })
          describe("SetMain function", function () {
              it("Only one person can call main", async function () {})
          })
          describe("Main can call controls", function () {
              it("Sets to player1 turn in Main", async function () {
                  const turn = await controls.getPlayerTurn()
                  assert.equal(turn, player1.address)
              })
              it("Only player 1 can only play", async function () {
                  await expect(player2_connection.deploy(3, 10)).to.be.reverted
                  await expect(player3_connection.deploy(3, 10)).to.be.reverted
                  await expect(player4_connection.deploy(3, 10)).to.be.reverted
                  await expect(player1_connection.deploy(3, 41)).to.emit(controls, "PlayerDeploying")
              })
              it("Only player 1 can deploy", async function () {
                  await expect(player1_connection.attack(3, 10, 10)).to.be.reverted
                  await expect(player1_connection.fortify(3, 3, 3)).to.be.reverted
                  await expect(player1_connection.deploy(3, 2)).to.emit(controls, "PlayerDeploying")
              })
              it("Only player 1 can attack after deploying", async function () {
                  await expect(player2_connection.deploy(1, 5)).to.be.reverted
                  await expect(player3_connection.deploy(7, 2)).to.be.reverted
                  await expect(player4_connection.deploy(1, 1)).to.be.reverted
                  await expect(player1_connection.deploy(3, 2)).to.emit(controls, "PlayerDeploying")
                  await expect(player2_connection.attack(5, 5, 5)).to.be.reverted
                  await expect(player3_connection.attack(6, 6, 5)).to.be.reverted
                  await expect(player4_connection.attack(4, 4, 5)).to.be.reverted
                  await expect(player1_connection.attack(2, 13, 3)).to.emit(controls, "PlayerAttacking")
              })
              it("Continents are assigned", async function () {
                  await expect(player1_connection.deploy(3, 4)).to.emit(controls, "PlayerDeploying")
                  // territory = await data.getTerritories(i);
                  continents = await data.getContinentInfo()
                  assert.equal(continents[0].owner, 4)
                  assert.equal(continents[1].owner, 4)
                  assert.equal(continents[2].owner, 4)
                  assert.equal(continents[3].owner, 4)
                  assert.equal(continents[4].owner, 4)
                  assert.equal(continents[5].owner, 4)
                  assert.equal(continents[0].troopBonus, 5)
                  assert.equal(continents[1].troopBonus, 2)
                  assert.equal(continents[2].troopBonus, 5)
                  assert.equal(continents[3].troopBonus, 3)
                  assert.equal(continents[4].troopBonus, 7)
                  assert.equal(continents[5].troopBonus, 2)
              })
          })
          describe("We can deploy troops", function () {
              it("Deploying troops to territory not owned by player.", async function () {
                  territoryOwner = await data.getTerritories(1)
                  console.log("Territory owned by ", territoryOwner.owner)
                  await expect(player1_connection.deploy(3, 1)).to.be.reverted

                  //   territoryDeployingTo = await data.getTerritories(4)
                  //   console.log("Territory deploying to starts with ", territoryDeployingTo.troops.toNumber(), " troops.")
                  //   await player1_connection.deploy(3, 4)
                  //   console.log("Territory deploying to now has ", territoryDeployingTo.troops.toNumber(), " troops.")
              })
          })
          describe("We receive some randomness when we attack", function () {
              it("Rolls the Dice Correctly", async function () {
                  await player1_connection.deploy(3, 4)
                  const tx = await player1_connection.attack(2, 13, 3)
                  const receipt = await tx.wait(1)
                  requestId = await controls.getRequestId()
                  await expect(
                      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, controls.address) // We can DELETE s_requestId from Storage in the contract (if this passes)
                  ).to.emit(controls, "DiceRolled")
              })
          })
          describe("We successfully attack", function () {
              it("Attack successful", async function () {
                  territoryAttacking = await data.getTerritories(2)
                  territoryDefending = await data.getTerritories(13)
                  console.log("Defending territory has: ", territoryDefending.troops.toNumber())
                  console.log("Attacking territory has: ", territoryAttacking.troops.toNumber())

                  await player1_connection.deploy(3, 4)
                  const tx = await player1_connection.attack(2, 13, 3)
                  const receipt = await tx.wait(1)
                  requestId = await controls.getRequestId()
                  await expect(
                      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, controls.address) // We can DELETE s_requestId from Storage in the contract (if this passes)
                  ).to.emit(controls, "DiceRolled")

                  territoryAttacking = await data.getTerritories(2)
                  territoryDefending = await data.getTerritories(13)
                  console.log("After the battle defending territory has: ", territoryDefending.troops.toNumber())
                  console.log("After the battle Attacking territory has: ", territoryAttacking.troops.toNumber())
              })
              //   it("Territory conquered successful", async function () {
              //       await player1_connection.deploy(4, 2)

              //       territoryAttacking = await data.getTerritories(2)
              //       territoryDefending = await data.getTerritories(13)
              //       console.log("Defending territory has: ", territoryDefending.troops.toNumber())
              //       console.log("Attacking territory has: ", territoryAttacking.troops.toNumber())

              //       const tx = await player1_connection.attack(2, 13, 3)
              //       const receipt = await tx.wait(1)
              //       requestId = await controls.getRequestId()
              //       await expect(
              //           await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, controls.address) // We can DELETE s_requestId from Storage in the contract (if this passes)
              //       ).to.emit(controls, "DiceRolled")

              //       territoryAttacking = await data.getTerritories(2)
              //       territoryDefending = await data.getTerritories(13)
              //       console.log("After the first battle defending territory has: ", territoryDefending.troops.toNumber())
              //       console.log("After the first battle Attacking territory has: ", territoryAttacking.troops.toNumber())

              //       const tx2 = await player1_connection.attack(2, 13, 2)
              //       const receipt2 = await tx2.wait(1)
              //       requestId = await controls.getRequestId()
              //       await expect(
              //           await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, controls.address) // We can DELETE s_requestId from Storage in the contract (if this passes)
              //       ).to.emit(controls, "DiceRolled")

              //       territoryAttacking = await data.getTerritories(2)
              //       territoryDefending = await data.getTerritories(13)
              //       console.log("After the second battle defending territory has: ", territoryDefending.troops.toNumber())
              //       console.log("After the second battle Attacking territory has: ", territoryAttacking.troops.toNumber())
              //   })
          })
      })
