const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { BytesLike, parseEther } = require("ethers/lib/utils");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Deploy Unit Tests", async function () {
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
              deploy = await ethers.getContract("Deploy");
              player1_connection = main.connect(player1);
              player2_connection = main.connect(player2);
              player3_connection = main.connect(player3);
              player4_connection = main.connect(player4);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              entranceFee = await main.getEntranceFee();
          });

          describe("Main can call deploy", function () {
              it("Calls deploy function from main contract", async function () {
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
                      vrfCoordinatorV2Mock.fulfillRandomWords(secondId, main.address)
                  ).to.emit(deploy, "Deploying");
              });
              it("Deploy function is returned", async function () {});
          });
      });
