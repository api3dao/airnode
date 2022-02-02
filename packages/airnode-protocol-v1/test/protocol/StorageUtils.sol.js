/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let airnodeProtocol;
let endpointId, templateParameters, templateId;
let subscriptionId,
  chainId,
  airnodeAddress,
  subscriptionParameters,
  subscriptionConditions,
  relayer,
  sponsor,
  requester,
  fulfillFunctionId;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    randomPerson: accounts[9],
  };
  const airnodeProtocolFactory = await hre.ethers.getContractFactory('AirnodeProtocol', roles.deployer);
  airnodeProtocol = await airnodeProtocolFactory.deploy();
  endpointId = testUtils.generateRandomBytes32();
  templateParameters = testUtils.generateRandomBytes();
  templateId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['bytes32', 'bytes'], [endpointId, templateParameters])
  );
  chainId = 3;
  airnodeAddress = testUtils.generateRandomAddress();
  subscriptionParameters = testUtils.generateRandomBytes();
  subscriptionConditions = testUtils.generateRandomBytes();
  relayer = testUtils.generateRandomAddress();
  sponsor = testUtils.generateRandomAddress();
  requester = testUtils.generateRandomAddress();
  fulfillFunctionId = '0x12345678';
  subscriptionId = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(
      ['uint256', 'address', 'bytes32', 'bytes', 'bytes', 'address', 'address', 'address', 'bytes4'],
      [
        chainId,
        airnodeAddress,
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

describe('constructor', function () {
  it('constructs', async function () {
    expect(await airnodeProtocol.MAXIMUM_PARAMETER_LENGTH()).to.equal(4096);
  });
});

describe('storeTemplate', function () {
  context('Template parameters are not too long', function () {
    it('stores and registers template', async function () {
      await expect(airnodeProtocol.connect(roles.randomPerson).storeTemplate(endpointId, templateParameters))
        .to.emit(airnodeProtocol, 'StoredTemplate')
        .withArgs(templateId, endpointId, templateParameters);
      const template = await airnodeProtocol.templates(templateId);
      expect(template.endpointId).to.equal(endpointId);
      expect(template.parameters).to.equal(templateParameters);
    });
  });
  context('Template parameters are too long', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol.connect(roles.randomPerson).storeTemplate(endpointId, `0x${'12'.repeat(4096 + 1)}`)
      ).to.be.revertedWith('Parameters too long');
    });
  });
});

describe('storeSubscription', function () {
  context('Chain ID is not zero', function () {
    context('Airnode address is not zero', function () {
      context('Subscription parameters are not too long', function () {
        context('Subscription conditions are not too long', function () {
          context('Relayer address is not zero', function () {
            context('Sponsor address is not zero', function () {
              context('Requester address is not zero', function () {
                context('Fulfill function ID is not zero', function () {
                  it('stores subscription', async function () {
                    await expect(
                      airnodeProtocol
                        .connect(roles.randomPerson)
                        .storeSubscription(
                          chainId,
                          airnodeAddress,
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
                        chainId,
                        airnodeAddress,
                        templateId,
                        subscriptionParameters,
                        subscriptionConditions,
                        relayer,
                        sponsor,
                        requester,
                        fulfillFunctionId
                      );
                    const subscription = await airnodeProtocol.subscriptions(subscriptionId);
                    expect(subscription.chainId).to.equal(chainId);
                    expect(subscription.airnode).to.equal(airnodeAddress);
                    expect(subscription.templateId).to.equal(templateId);
                    expect(subscription.parameters).to.equal(subscriptionParameters);
                    expect(subscription.conditions).to.equal(subscriptionConditions);
                    expect(subscription.relayer).to.equal(relayer);
                    expect(subscription.sponsor).to.equal(sponsor);
                    expect(subscription.requester).to.equal(requester);
                    expect(subscription.fulfillFunctionId).to.equal(fulfillFunctionId);
                  });
                });
                context('Fulfill function ID is zero', function () {
                  it('reverts', async function () {
                    await expect(
                      airnodeProtocol
                        .connect(roles.randomPerson)
                        .storeSubscription(
                          chainId,
                          airnodeAddress,
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
                  await expect(
                    airnodeProtocol
                      .connect(roles.randomPerson)
                      .storeSubscription(
                        chainId,
                        airnodeAddress,
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
                await expect(
                  airnodeProtocol
                    .connect(roles.randomPerson)
                    .storeSubscription(
                      chainId,
                      airnodeAddress,
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
              await expect(
                airnodeProtocol
                  .connect(roles.randomPerson)
                  .storeSubscription(
                    chainId,
                    airnodeAddress,
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
            await expect(
              airnodeProtocol
                .connect(roles.randomPerson)
                .storeSubscription(
                  chainId,
                  airnodeAddress,
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
          await expect(
            airnodeProtocol
              .connect(roles.randomPerson)
              .storeSubscription(
                chainId,
                airnodeAddress,
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
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        await expect(
          airnodeProtocol
            .connect(roles.randomPerson)
            .storeSubscription(
              chainId,
              hre.ethers.constants.AddressZero,
              templateId,
              subscriptionParameters,
              subscriptionConditions,
              relayer,
              sponsor,
              requester,
              fulfillFunctionId
            )
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Chain ID is zero', function () {
    it('reverts', async function () {
      await expect(
        airnodeProtocol
          .connect(roles.randomPerson)
          .storeSubscription(
            0,
            airnodeAddress,
            templateId,
            subscriptionParameters,
            subscriptionConditions,
            relayer,
            sponsor,
            requester,
            fulfillFunctionId
          )
      ).to.be.revertedWith('Chain ID zero');
    });
  });
});
