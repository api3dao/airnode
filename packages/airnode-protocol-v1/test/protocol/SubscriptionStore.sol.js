/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol;
let airnodeAddress, endpointId, templateParameters, templateId;
let subscriptionId, subscriptionParameters, subscriptionConditions, relayer, sponsor, requester, fulfillFunctionId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  airnodeAddress = testUtils.generateRandomAddress();
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address', 'bytes32', 'bytes'], [airnodeAddress, endpointId, templateParameters])
  );
  subscriptionParameters = testUtils.generateRandomBytes();
  subscriptionConditions = testUtils.generateRandomBytes();
  relayer = testUtils.generateRandomAddress();
  sponsor = testUtils.generateRandomAddress();
  requester = testUtils.generateRandomAddress();
  fulfillFunctionId = '0x12345678';
  subscriptionId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        (await hre.ethers.provider.getNetwork()).chainId,
        templateId,
        subscriptionParameters,
        subscriptionConditions,
        relayer,
        sponsor,
        requester,
        fulfillFunctionId,
      ]
    )
  );
});

describe('storeSubscription', function () {
  context('Template is registered', function () {
    context('Subscription parameters are not too long', function () {
      context('Subscription conditions are not too long', function () {
        context('Relayer address is not zero', function () {
          context('Sponsor address is not zero', function () {
            context('Requester address is not zero', function () {
              context('Fulfill function ID is not zero', function () {
                it('stores subscription', async function () {
                  await airnodeProtocol
                    .connect(roles.randomPerson)
                    .registerTemplate(airnodeAddress, endpointId, templateParameters);
                  await expect(
                    airnodeProtocol
                      .connect(roles.randomPerson)
                      .storeSubscription(
                        templateId,
                        subscriptionParameters,
                        subscriptionConditions,
                        relayer,
                        sponsor,
                        requester,
                        fulfillFunctionId
                      )
                  )
                    .to.emit(airnodeProtocol, 'StoredSubscription')
                    .withArgs(
                      subscriptionId,
                      templateId,
                      subscriptionParameters,
                      subscriptionConditions,
                      relayer,
                      sponsor,
                      requester,
                      fulfillFunctionId
                    );
                });
              });
              context('Fulfill function ID is zero', function () {
                it('reverts', async function () {
                  await airnodeProtocol
                    .connect(roles.randomPerson)
                    .registerTemplate(airnodeAddress, endpointId, templateParameters);
                  await expect(
                    airnodeProtocol
                      .connect(roles.randomPerson)
                      .storeSubscription(
                        templateId,
                        subscriptionParameters,
                        subscriptionConditions,
                        relayer,
                        sponsor,
                        requester,
                        '0x00000000'
                      )
                  ).to.be.revertedWith('Fulfill function ID zero');
                });
              });
            });
            context('Requester address is zero', function () {
              it('reverts', async function () {
                await airnodeProtocol
                  .connect(roles.randomPerson)
                  .registerTemplate(airnodeAddress, endpointId, templateParameters);
                await expect(
                  airnodeProtocol
                    .connect(roles.randomPerson)
                    .storeSubscription(
                      templateId,
                      subscriptionParameters,
                      subscriptionConditions,
                      relayer,
                      sponsor,
                      hre.ethers.constants.AddressZero,
                      fulfillFunctionId
                    )
                ).to.be.revertedWith('Requester address zero');
              });
            });
          });
          context('Sponsor address is zero', function () {
            it('reverts', async function () {
              await airnodeProtocol
                .connect(roles.randomPerson)
                .registerTemplate(airnodeAddress, endpointId, templateParameters);
              await expect(
                airnodeProtocol
                  .connect(roles.randomPerson)
                  .storeSubscription(
                    templateId,
                    subscriptionParameters,
                    subscriptionConditions,
                    relayer,
                    hre.ethers.constants.AddressZero,
                    requester,
                    fulfillFunctionId
                  )
              ).to.be.revertedWith('Sponsor address zero');
            });
          });
        });
        context('Relayer address is zero', function () {
          it('reverts', async function () {
            await airnodeProtocol
              .connect(roles.randomPerson)
              .registerTemplate(airnodeAddress, endpointId, templateParameters);
            await expect(
              airnodeProtocol
                .connect(roles.randomPerson)
                .storeSubscription(
                  templateId,
                  subscriptionParameters,
                  subscriptionConditions,
                  hre.ethers.constants.AddressZero,
                  sponsor,
                  requester,
                  fulfillFunctionId
                )
            ).to.be.revertedWith('Relayer address zero');
          });
        });
      });
      context('Subscription conditions are too long', function () {
        it('reverts', async function () {
          await airnodeProtocol
            .connect(roles.randomPerson)
            .registerTemplate(airnodeAddress, endpointId, templateParameters);
          await expect(
            airnodeProtocol
              .connect(roles.randomPerson)
              .storeSubscription(
                templateId,
                subscriptionParameters,
                `0x${'12'.repeat(4096 + 1)}`,
                relayer,
                sponsor,
                requester,
                fulfillFunctionId
              )
          ).to.be.revertedWith('Conditions too long');
        });
      });
    });
    context('Subscription parameters are too long', function () {
      it('reverts', async function () {
        await airnodeProtocol
          .connect(roles.randomPerson)
          .registerTemplate(airnodeAddress, endpointId, templateParameters);
        await expect(
          airnodeProtocol
            .connect(roles.randomPerson)
            .storeSubscription(
              templateId,
              `0x${'12'.repeat(4096 + 1)}`,
              subscriptionConditions,
              relayer,
              sponsor,
              requester,
              fulfillFunctionId
            )
        ).to.be.revertedWith('Parameters too long');
      });
    });
  });
  context('Template is not registered', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol
          .connect(roles.randomPerson)
          .storeSubscription(
            templateId,
            subscriptionParameters,
            subscriptionConditions,
            relayer,
            sponsor,
            requester,
            fulfillFunctionId
          )
      ).to.be.revertedWith('Template not registered');
    });
  });
});
