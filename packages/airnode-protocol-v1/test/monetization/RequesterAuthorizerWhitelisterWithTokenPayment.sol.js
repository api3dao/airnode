/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry,
  airnodeEndpointPriceRegistry,
  requesterAuthorizerRegistry,
  requesterAuthorizerWithManager,
  requesterAuthorizerWhitelisterWithTokenPayment,
  token;
let requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription =
  'RequesterAuthorizerWhitelisterWithTokenPayment admin';
let tokenDecimals = 12;
let tokenPrice = hre.ethers.BigNumber.from(`5${'0'.repeat(18)}`); // $5
let priceCoefficient = hre.ethers.BigNumber.from(`2${'0'.repeat(tokenDecimals)}`); // 2x
let chainId = 3;

const AirnodeParticipationStatus = Object.freeze({ Inactive: 0, Active: 1, OptedOut: 2 });

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    proceedsDestination: accounts[2],
    maintainer: accounts[3],
    blocker: accounts[4],
    airnode: accounts[5],
    payer: accounts[6],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeEndpointPriceRegistryFactory = await hre.ethers.getContractFactory(
    'AirnodeEndpointPriceRegistry',
    roles.deployer
  );
  airnodeEndpointPriceRegistry = await airnodeEndpointPriceRegistryFactory.deploy(
    accessControlRegistry.address,
    'AirnodeEndpointPriceRegistry admin',
    roles.manager.address
  );
  const requesterAuthorizerRegistryFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerRegistry',
    roles.deployer
  );
  requesterAuthorizerRegistry = await requesterAuthorizerRegistryFactory.deploy(
    accessControlRegistry.address,
    'RequesterAuthorizerRegistry admin',
    roles.manager.address
  );
  const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerWithManager',
    roles.deployer
  );
  requesterAuthorizerWithManager = await requesterAuthorizerWithManagerFactory.deploy(
    accessControlRegistry.address,
    'RequesterAuthorizerWithManager admin',
    roles.manager.address
  );
  await requesterAuthorizerRegistry
    .connect(roles.manager)
    .registerChainRequesterAuthorizer(chainId, requesterAuthorizerWithManager.address);
  const tokenFactory = await hre.ethers.getContractFactory('MockERC20', roles.deployer);
  token = await tokenFactory.deploy(tokenDecimals);
  const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerWhitelisterWithTokenPayment',
    roles.deployer
  );
  requesterAuthorizerWhitelisterWithTokenPayment = await requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
    accessControlRegistry.address,
    requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
    roles.manager.address,
    airnodeEndpointPriceRegistry.address,
    requesterAuthorizerRegistry.address,
    token.address,
    tokenPrice,
    priceCoefficient,
    roles.proceedsDestination.address
  );

  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, await requesterAuthorizerWithManager.adminRoleDescription());
  const whitelistExpirationSetterRole = await requesterAuthorizerWithManager.whitelistExpirationSetterRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      await requesterAuthorizerWithManager.adminRole(),
      await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION()
    );
  await accessControlRegistry
    .connect(roles.manager)
    .grantRole(whitelistExpirationSetterRole, requesterAuthorizerWhitelisterWithTokenPayment.address);

  const adminRole = await requesterAuthorizerWhitelisterWithTokenPayment.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      managerRootRole,
      requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription
    );
  const maintainerRole = await requesterAuthorizerWhitelisterWithTokenPayment.maintainerRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      adminRole,
      await requesterAuthorizerWhitelisterWithTokenPayment.MAINTAINER_ROLE_DESCRIPTION()
    );
  await accessControlRegistry.connect(roles.manager).grantRole(maintainerRole, roles.maintainer.address);
  const blockerRole = await requesterAuthorizerWhitelisterWithTokenPayment.blockerRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      adminRole,
      await requesterAuthorizerWhitelisterWithTokenPayment.BLOCKER_ROLE_DESCRIPTION()
    );
  await accessControlRegistry.connect(roles.manager).grantRole(blockerRole, roles.blocker.address);
  await token.connect(roles.deployer).transfer(roles.payer.address, hre.ethers.utils.parseEther('1'));
});

describe('constructor', function () {
  context('Token address is not zero', function () {
    context('Token price is not zero', function () {
      context('Price coefficient is not zero', function () {
        context('Proceeds destination is not zero', function () {
          context('Price denomination matches with the registry', function () {
            context('Price decimals matches with the registry', function () {
              context('Pricing interval matches with the registry', function () {
                it('constructs', async function () {
                  const adminRole = await requesterAuthorizerWhitelisterWithTokenPayment.adminRole();
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.MAINTAINER_ROLE_DESCRIPTION()).to.equal(
                    'Maintainer'
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.maintainerRole()).to.equal(
                    hre.ethers.utils.keccak256(
                      hre.ethers.utils.solidityPack(
                        ['bytes32', 'bytes32'],
                        [
                          adminRole,
                          hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['string'], ['Maintainer'])),
                        ]
                      )
                    )
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.BLOCKER_ROLE_DESCRIPTION()).to.equal(
                    'Blocker'
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.blockerRole()).to.equal(
                    hre.ethers.utils.keccak256(
                      hre.ethers.utils.solidityPack(
                        ['bytes32', 'bytes32'],
                        [adminRole, hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['string'], ['Blocker']))]
                      )
                    )
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.token()).to.equal(token.address);
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.tokenPrice()).to.equal(tokenPrice);
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.priceCoefficient()).to.equal(
                    priceCoefficient
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.proceedsDestination()).to.equal(
                    roles.proceedsDestination.address
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.minimumWhitelistExtension()).to.equal(
                    24 * 60 * 60
                  );
                  expect(await requesterAuthorizerWhitelisterWithTokenPayment.maximumWhitelistDuration()).to.equal(
                    365 * 24 * 60 * 60
                  );
                });
              });
              context('Pricing interval matches with the registry', function () {
                it('reverts', async function () {
                  const mockAirnodeEndpointPriceRegistryFactory = await hre.ethers.getContractFactory(
                    'MockAirnodeEndpointPriceRegistry',
                    roles.deployer
                  );
                  const mockAirnodeEndpointPriceRegistry = await mockAirnodeEndpointPriceRegistryFactory.deploy(
                    'USD',
                    18,
                    12 * 30 * 24 * 60 * 60
                  );
                  const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
                    'RequesterAuthorizerWhitelisterWithTokenPayment',
                    roles.deployer
                  );
                  await expect(
                    requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
                      accessControlRegistry.address,
                      requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
                      roles.manager.address,
                      mockAirnodeEndpointPriceRegistry.address,
                      requesterAuthorizerRegistry.address,
                      token.address,
                      tokenPrice,
                      priceCoefficient,
                      roles.proceedsDestination.address
                    )
                  ).to.be.revertedWith('Pricing interval mismatch');
                });
              });
            });
            context('Price decimals does not match with the registry', function () {
              it('reverts', async function () {
                const mockAirnodeEndpointPriceRegistryFactory = await hre.ethers.getContractFactory(
                  'MockAirnodeEndpointPriceRegistry',
                  roles.deployer
                );
                const mockAirnodeEndpointPriceRegistry = await mockAirnodeEndpointPriceRegistryFactory.deploy(
                  'USD',
                  12,
                  30 * 24 * 60 * 60
                );
                const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
                  'RequesterAuthorizerWhitelisterWithTokenPayment',
                  roles.deployer
                );
                await expect(
                  requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
                    accessControlRegistry.address,
                    requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
                    roles.manager.address,
                    mockAirnodeEndpointPriceRegistry.address,
                    requesterAuthorizerRegistry.address,
                    token.address,
                    tokenPrice,
                    priceCoefficient,
                    roles.proceedsDestination.address
                  )
                ).to.be.revertedWith('Price decimals mismatch');
              });
            });
          });
          context('Price denomination does not match with the registry', function () {
            it('reverts', async function () {
              const mockAirnodeEndpointPriceRegistryFactory = await hre.ethers.getContractFactory(
                'MockAirnodeEndpointPriceRegistry',
                roles.deployer
              );
              const mockAirnodeEndpointPriceRegistry = await mockAirnodeEndpointPriceRegistryFactory.deploy(
                'EUR',
                18,
                30 * 24 * 60 * 60
              );
              const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
                'RequesterAuthorizerWhitelisterWithTokenPayment',
                roles.deployer
              );
              await expect(
                requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
                  accessControlRegistry.address,
                  requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
                  roles.manager.address,
                  mockAirnodeEndpointPriceRegistry.address,
                  requesterAuthorizerRegistry.address,
                  token.address,
                  tokenPrice,
                  priceCoefficient,
                  roles.proceedsDestination.address
                )
              ).to.be.revertedWith('Price denomination mismatch');
            });
          });
        });
        context('Proceeds destination is zero', function () {
          it('reverts', async function () {
            const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
              'RequesterAuthorizerWhitelisterWithTokenPayment',
              roles.deployer
            );
            await expect(
              requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
                accessControlRegistry.address,
                requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
                roles.manager.address,
                airnodeEndpointPriceRegistry.address,
                requesterAuthorizerRegistry.address,
                token.address,
                tokenPrice,
                priceCoefficient,
                hre.ethers.constants.AddressZero
              )
            ).to.be.revertedWith('Proceeds destination zero');
          });
        });
      });
      context('Price coefficient is zero', function () {
        it('reverts', async function () {
          const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
            'RequesterAuthorizerWhitelisterWithTokenPayment',
            roles.deployer
          );
          await expect(
            requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
              accessControlRegistry.address,
              requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
              roles.manager.address,
              airnodeEndpointPriceRegistry.address,
              requesterAuthorizerRegistry.address,
              token.address,
              tokenPrice,
              0,
              roles.proceedsDestination.address
            )
          ).to.be.revertedWith('Price coefficient zero');
        });
      });
    });
    context('Token price is zero', function () {
      it('reverts', async function () {
        const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
          'RequesterAuthorizerWhitelisterWithTokenPayment',
          roles.deployer
        );
        await expect(
          requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
            accessControlRegistry.address,
            requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
            roles.manager.address,
            airnodeEndpointPriceRegistry.address,
            requesterAuthorizerRegistry.address,
            token.address,
            0,
            priceCoefficient,
            roles.proceedsDestination.address
          )
        ).to.be.revertedWith('Token price zero');
      });
    });
  });
  context('Token address is zero', function () {
    it('reverts', async function () {
      const requesterAuthorizerWhitelisterWithTokenPaymentFactory = await hre.ethers.getContractFactory(
        'RequesterAuthorizerWhitelisterWithTokenPayment',
        roles.deployer
      );
      await expect(
        requesterAuthorizerWhitelisterWithTokenPaymentFactory.deploy(
          accessControlRegistry.address,
          requesterAuthorizerWhitelisterWithTokenPaymentAdminRoleDescription,
          roles.manager.address,
          airnodeEndpointPriceRegistry.address,
          requesterAuthorizerRegistry.address,
          hre.ethers.constants.AddressZero,
          tokenPrice,
          priceCoefficient,
          roles.proceedsDestination.address
        )
      ).to.be.revertedWith('Token address zero');
    });
  });
});

describe('setTokenPrice', function () {
  context('Sender is maintainer', function () {
    context('Token price is not zero', function () {
      it('sets token price', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setTokenPrice(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetTokenPrice')
          .withArgs(123, roles.maintainer.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.tokenPrice()).to.equal(123);
      });
    });
    context('Token price is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setTokenPrice(0)
        ).to.be.revertedWith('Token price zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Token price is not zero', function () {
      it('sets token price', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setTokenPrice(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetTokenPrice')
          .withArgs(123, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.tokenPrice()).to.equal(123);
      });
    });
    context('Token price is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setTokenPrice(0)
        ).to.be.revertedWith('Token price zero');
      });
    });
  });
  context('Sender is not maintainer and manager', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.randomPerson).setTokenPrice(123)
      ).to.be.revertedWith('Sender cannot maintain');
    });
  });
});

describe('setPriceCoefficient', function () {
  context('Sender is maintainer', function () {
    context('Price coefficient is not zero', function () {
      it('sets price coefficient', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setPriceCoefficient(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetPriceCoefficient')
          .withArgs(123, roles.maintainer.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.priceCoefficient()).to.equal(123);
      });
    });
    context('Price coefficient is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setPriceCoefficient(0)
        ).to.be.revertedWith('Price coefficient zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Price coefficient is not zero', function () {
      it('sets price coefficient', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setPriceCoefficient(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetPriceCoefficient')
          .withArgs(123, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.priceCoefficient()).to.equal(123);
      });
    });
    context('Price coefficient is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setPriceCoefficient(0)
        ).to.be.revertedWith('Price coefficient zero');
      });
    });
  });
  context('Sender is not maintainer and manager', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.randomPerson).setPriceCoefficient(123)
      ).to.be.revertedWith('Sender cannot maintain');
    });
  });
});

describe('setAirnodeParticipationStatus', function () {
  context('Airnode address is not zero', function () {
    context('Sender is Airnode', function () {
      context('Status is not Active', function () {
        it('sets Airnode participation status', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetAirnodeParticipationStatus')
            .withArgs(roles.airnode.address, AirnodeParticipationStatus.OptedOut, roles.airnode.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToParticipationStatus(roles.airnode.address)
          ).to.equal(AirnodeParticipationStatus.OptedOut);
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetAirnodeParticipationStatus')
            .withArgs(roles.airnode.address, AirnodeParticipationStatus.Inactive, roles.airnode.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToParticipationStatus(roles.airnode.address)
          ).to.equal(AirnodeParticipationStatus.Inactive);
        });
      });
      context('Status is Active', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
          ).to.be.revertedWith('Airnode cannot activate itself');
        });
      });
    });
    context('Sender is maintainer', function () {
      context('Status is not OptedOut', function () {
        context('Airnode has not opted out', function () {
          it('sets Airnode participation status', async function () {
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Active, roles.maintainer.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Active);
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Inactive, roles.maintainer.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Inactive);
          });
        });
        context('Airnode has opted out', function () {
          it('reverts', async function () {
            await requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut);
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            ).to.be.revertedWith('Airnode opted out');
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            ).to.be.revertedWith('Airnode opted out');
          });
        });
      });
      context('Status is OptedOut', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.maintainer)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
          ).to.be.revertedWith('Only Airnode can opt out');
        });
      });
    });
    context('Sender is manager', function () {
      context('Status is not OptedOut', function () {
        context('Airnode has not opted out', function () {
          it('sets Airnode participation status', async function () {
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Active, roles.manager.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Active);
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Inactive, roles.manager.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Inactive);
          });
        });
        context('Airnode has opted out', function () {
          it('reverts', async function () {
            await requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut);
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            ).to.be.revertedWith('Airnode opted out');
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            ).to.be.revertedWith('Airnode opted out');
          });
        });
      });
      context('Status is OptedOut', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.manager)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
          ).to.be.revertedWith('Only Airnode can opt out');
        });
      });
    });
    context('Sender is not maintainer and manager', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.randomPerson)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
        ).to.be.revertedWith('Sender cannot maintain');
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.randomPerson)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
        ).to.be.revertedWith('Sender cannot maintain');
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.randomPerson)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
        ).to.be.revertedWith('Sender cannot maintain');
      });
    });
  });
  context('Airnode address is zero', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(hre.ethers.constants.AddressZero, AirnodeParticipationStatus.Inactive)
      ).to.be.revertedWith('Airnode address zero');
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(hre.ethers.constants.AddressZero, AirnodeParticipationStatus.Active)
      ).to.be.revertedWith('Airnode address zero');
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(hre.ethers.constants.AddressZero, AirnodeParticipationStatus.OptedOut)
      ).to.be.revertedWith('Airnode address zero');
    });
  });
});

describe('setProceedsDestination', function () {
  context('Sender is manager', function () {
    context('Proceeds destination is not zero', function () {
      it('sets proceeds destination', async function () {
        const proceedsDestination = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.manager)
            .setProceedsDestination(proceedsDestination)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetProceedsDestination')
          .withArgs(proceedsDestination);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.proceedsDestination()).to.equal(
          proceedsDestination
        );
      });
    });
    context('Proceeds destination is zero', function () {
      it('reverts', async function () {
        const proceedsDestination = hre.ethers.constants.AddressZero;
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.manager)
            .setProceedsDestination(proceedsDestination)
        ).to.be.revertedWith('Proceeds destination zero');
      });
    });
  });
  context('Sender is not manager', function () {
    it('reverts', async function () {
      const proceedsDestination = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.randomPerson)
          .setProceedsDestination(proceedsDestination)
      ).to.be.revertedWith('Sender not manager');
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.maintainer)
          .setProceedsDestination(proceedsDestination)
      ).to.be.revertedWith('Sender not manager');
    });
  });
});

describe('setRequesterBlockStatus', function () {
  context('Sender is blocker', function () {
    context('Requester address is not zero', function () {
      it('sets requester block status', async function () {
        const requester = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.blocker).setRequesterBlockStatus(requester, true)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatus')
          .withArgs(requester, true, roles.blocker.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.requesterToBlockStatus(requester)).to.equal(true);
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.blocker)
            .setRequesterBlockStatus(requester, false)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatus')
          .withArgs(requester, false, roles.blocker.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.requesterToBlockStatus(requester)).to.equal(false);
      });
    });
    context('Requester address is zero', function () {
      it('reverts', async function () {
        const requester = hre.ethers.constants.AddressZero;
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.blocker).setRequesterBlockStatus(requester, true)
        ).to.be.revertedWith('Requester address zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Requester address is not zero', function () {
      it('sets requester block status', async function () {
        const requester = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setRequesterBlockStatus(requester, true)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatus')
          .withArgs(requester, true, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.requesterToBlockStatus(requester)).to.equal(true);
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.manager)
            .setRequesterBlockStatus(requester, false)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatus')
          .withArgs(requester, false, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.requesterToBlockStatus(requester)).to.equal(false);
      });
    });
    context('Requester address is zero', function () {
      it('reverts', async function () {
        const requester = hre.ethers.constants.AddressZero;
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setRequesterBlockStatus(requester, true)
        ).to.be.revertedWith('Requester address zero');
      });
    });
  });
  context('Sender is not maintainer and blocker', function () {
    it('reverts', async function () {
      const requester = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.randomPerson)
          .setRequesterBlockStatus(requester, true)
      ).to.be.revertedWith('Sender cannot block');
    });
  });
});

describe('setRequesterBlockStatusForAirnode', function () {
  context('Sender is blocker', function () {
    context('Airnode address is not zero', function () {
      context('Requester address is not zero', function () {
        it('sets requester block status', async function () {
          const requester = testUtils.generateRandomAddress();
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, true, roles.blocker.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToRequesterToBlockStatus(
              roles.airnode.address,
              requester
            )
          ).to.equal(true);
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, false)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, false, roles.blocker.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToRequesterToBlockStatus(
              roles.airnode.address,
              requester
            )
          ).to.equal(false);
        });
      });
      context('Requester address is zero', function () {
        it('reverts', async function () {
          const requester = hre.ethers.constants.AddressZero;
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
          ).to.be.revertedWith('Requester address zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const requester = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.blocker)
            .setRequesterBlockStatusForAirnode(hre.ethers.constants.AddressZero, requester, true)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Airnode address is not zero', function () {
      context('Requester address is not zero', function () {
        it('sets requester block status', async function () {
          const requester = testUtils.generateRandomAddress();
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.manager)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, true, roles.manager.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToRequesterToBlockStatus(
              roles.airnode.address,
              requester
            )
          ).to.equal(true);
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.manager)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, false)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, false, roles.manager.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenPayment.airnodeToRequesterToBlockStatus(
              roles.airnode.address,
              requester
            )
          ).to.equal(false);
        });
      });
      context('Requester address is zero', function () {
        it('reverts', async function () {
          const requester = hre.ethers.constants.AddressZero;
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.manager)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
          ).to.be.revertedWith('Requester address zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const requester = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.blocker)
            .setRequesterBlockStatusForAirnode(hre.ethers.constants.AddressZero, requester, true)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is not maintainer and blocker', function () {
    it('reverts', async function () {
      const requester = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.randomPerson)
          .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
      ).to.be.revertedWith('Sender cannot block');
    });
  });
});

describe('getTokenAmount', function () {
  context('Price registry returns a value', function () {
    it('gets token amount', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
      await airnodeEndpointPriceRegistry
        .connect(roles.manager)
        .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
      // $100 times 2 divided by $5 = 40 tokens with 12 decimals (because the token was defined to have 12 decimals)
      const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
      expect(
        await requesterAuthorizerWhitelisterWithTokenPayment.getTokenAmount(roles.airnode.address, chainId, endpointId)
      ).to.equal(expectedTokenAmount);
    });
  });
  context('Price registry reverts', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment.getTokenAmount(roles.airnode.address, chainId, endpointId)
      ).to.be.revertedWith('No default price set');
    });
  });
});

describe('setMinimumWhitelistExtension', function () {
  context('Sender is maintainer', function () {
    context('Minimum whitelist duration is valid', function () {
      it('sets minimum whitelist extension', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setMinimumWhitelistExtension(123)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetMinimumWhitelistExtension')
          .withArgs(123, roles.maintainer.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.minimumWhitelistExtension()).to.equal(123);
      });
    });
    context('Minimum whitelist duration is not valid', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setMinimumWhitelistExtension(0)
        ).to.be.revertedWith('Invalid minimum duration');
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.maintainer)
            .setMinimumWhitelistExtension(
              (await requesterAuthorizerWhitelisterWithTokenPayment.maximumWhitelistDuration()).add(1)
            )
        ).to.be.revertedWith('Invalid minimum duration');
      });
    });
  });
  context('Sender is manager', function () {
    context('Minimum whitelist duration is valid', function () {
      it('sets minimum whitelist extension', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setMinimumWhitelistExtension(123)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetMinimumWhitelistExtension')
          .withArgs(123, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.minimumWhitelistExtension()).to.equal(123);
      });
    });
    context('Minimum whitelist duration is not valid', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setMinimumWhitelistExtension(0)
        ).to.be.revertedWith('Invalid minimum duration');
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.manager)
            .setMinimumWhitelistExtension(
              (await requesterAuthorizerWhitelisterWithTokenPayment.maximumWhitelistDuration()).add(1)
            )
        ).to.be.revertedWith('Invalid minimum duration');
      });
    });
  });
  context('Sender is not maintainer and manager', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.randomPerson).setMinimumWhitelistExtension(123)
      ).to.be.revertedWith('Sender cannot maintain');
    });
  });
});

describe('setMaximumWhitelistDuration', function () {
  context('Sender is maintainer', function () {
    context('Minimum whitelist duration is valid', function () {
      it('sets minimum whitelist extension', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.maintainer).setMaximumWhitelistDuration(123456)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetMaximumWhitelistDuration')
          .withArgs(123456, roles.maintainer.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.maximumWhitelistDuration()).to.equal(123456);
      });
    });
    context('Minimum whitelist duration is not valid', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.maintainer)
            .setMaximumWhitelistDuration(
              (await requesterAuthorizerWhitelisterWithTokenPayment.minimumWhitelistExtension()).sub(1)
            )
        ).to.be.revertedWith('Invalid maximum duration');
      });
    });
  });
  context('Sender is manager', function () {
    context('Minimum whitelist duration is valid', function () {
      it('sets minimum whitelist extension', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.manager).setMaximumWhitelistDuration(123456)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'SetMaximumWhitelistDuration')
          .withArgs(123456, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenPayment.maximumWhitelistDuration()).to.equal(123456);
      });
    });
    context('Minimum whitelist duration is not valid', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.manager)
            .setMaximumWhitelistDuration(
              (await requesterAuthorizerWhitelisterWithTokenPayment.minimumWhitelistExtension()).sub(1)
            )
        ).to.be.revertedWith('Invalid maximum duration');
      });
    });
  });
  context('Sender is not maintainer and manager', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment.connect(roles.randomPerson).setMaximumWhitelistDuration(123)
      ).to.be.revertedWith('Sender cannot maintain');
    });
  });
});

describe('payTokens', function () {
  context('Airnode is active', function () {
    context('Chain ID is not zero', function () {
      context('Requester address is not zero', function () {
        context('Requester is not blocked globally or for the Airnode', function () {
          context('Whitelist expirations is not smaller than minimum', function () {
            context('Token transfer is successful', function () {
              context('RequesterAuthorizer for the chain is set', function () {
                context('Resulting whitelist expiration is not larger than maximum', function () {
                  it('sets whitelist expiration', async function () {
                    const endpointId = testUtils.generateRandomBytes32();
                    const requester = testUtils.generateRandomAddress();
                    const whitelistExtension = 7 * 24 * 60 * 60;
                    const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                    const expectedTokenAmount = price
                      .mul(priceCoefficient)
                      .div(tokenPrice)
                      .mul(whitelistExtension)
                      .div(30 * 24 * 60 * 60);
                    await airnodeEndpointPriceRegistry
                      .connect(roles.manager)
                      .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
                    await requesterAuthorizerWhitelisterWithTokenPayment
                      .connect(roles.maintainer)
                      .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                    await token
                      .connect(roles.payer)
                      .approve(
                        requesterAuthorizerWhitelisterWithTokenPayment.address,
                        hre.ethers.utils.parseEther('1')
                      );
                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        requester
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                    const nextTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextTimestamp]);
                    await expect(
                      requesterAuthorizerWhitelisterWithTokenPayment
                        .connect(roles.payer)
                        .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
                    )
                      .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'PaidTokens')
                      .withArgs(
                        roles.airnode.address,
                        chainId,
                        endpointId,
                        requester,
                        whitelistExtension,
                        roles.payer.address,
                        nextTimestamp + whitelistExtension
                      );
                    expect(await token.balanceOf(roles.proceedsDestination.address)).to.equal(expectedTokenAmount);
                    expect(await token.balanceOf(roles.payer.address)).to.equal(
                      hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
                    );
                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        requester
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(nextTimestamp + whitelistExtension);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                });
                context('Resulting whitelist expiration is larger than maximum', function () {
                  it('reverts', async function () {
                    const endpointId = testUtils.generateRandomBytes32();
                    const requester = testUtils.generateRandomAddress();
                    const whitelistExtension = 365 * 24 * 60 * 60 + 1;
                    const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                    await airnodeEndpointPriceRegistry
                      .connect(roles.manager)
                      .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
                    await requesterAuthorizerWhitelisterWithTokenPayment
                      .connect(roles.maintainer)
                      .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                    await token
                      .connect(roles.payer)
                      .approve(
                        requesterAuthorizerWhitelisterWithTokenPayment.address,
                        hre.ethers.utils.parseEther('1')
                      );
                    await expect(
                      requesterAuthorizerWhitelisterWithTokenPayment
                        .connect(roles.payer)
                        .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
                    ).to.be.revertedWith('Exceeds maximum duration');
                  });
                });
              });
              context('RequesterAuthorizer for the chain is not set', function () {
                it('reverts', async function () {
                  const anotherChainId = chainId + 1;
                  const endpointId = testUtils.generateRandomBytes32();
                  const requester = testUtils.generateRandomAddress();
                  const whitelistExtension = 7 * 24 * 60 * 60;
                  const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                  await airnodeEndpointPriceRegistry
                    .connect(roles.manager)
                    .registerAirnodeChainEndpointPrice(roles.airnode.address, anotherChainId, endpointId, price);
                  await requesterAuthorizerWhitelisterWithTokenPayment
                    .connect(roles.maintainer)
                    .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                  await token
                    .connect(roles.payer)
                    .approve(requesterAuthorizerWhitelisterWithTokenPayment.address, hre.ethers.utils.parseEther('1'));
                  await expect(
                    requesterAuthorizerWhitelisterWithTokenPayment
                      .connect(roles.payer)
                      .payTokens(roles.airnode.address, anotherChainId, endpointId, requester, whitelistExtension)
                  ).to.be.revertedWith('No Authorizer set for chain');
                });
              });
            });
            context('Token transfer is not successful', function () {
              it('reverts', async function () {
                const endpointId = testUtils.generateRandomBytes32();
                const requester = testUtils.generateRandomAddress();
                const whitelistExtension = 7 * 24 * 60 * 60;
                const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                await airnodeEndpointPriceRegistry
                  .connect(roles.manager)
                  .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
                await requesterAuthorizerWhitelisterWithTokenPayment
                  .connect(roles.maintainer)
                  .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                await expect(
                  requesterAuthorizerWhitelisterWithTokenPayment
                    .connect(roles.payer)
                    .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
                ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
              });
            });
          });
          context('Whitelist expirations is smaller than minimum', function () {
            it('reverts', async function () {
              const endpointId = testUtils.generateRandomBytes32();
              const requester = testUtils.generateRandomAddress();
              const whitelistExtension = 123;
              await requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
              await expect(
                requesterAuthorizerWhitelisterWithTokenPayment
                  .connect(roles.payer)
                  .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
              ).to.be.revertedWith('Extension below minimum');
            });
          });
        });
        context('Requester is blocked globally', function () {
          it('reverts', async function () {
            const endpointId = testUtils.generateRandomBytes32();
            const requester = testUtils.generateRandomAddress();
            const whitelistExtension = 7 * 24 * 60 * 60;
            await requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.maintainer)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
            await requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.blocker)
              .setRequesterBlockStatus(requester, true);
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.payer)
                .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
            ).to.be.revertedWith('Requester blocked');
          });
        });
        context('Requester is blocked for Airnode', function () {
          it('reverts', async function () {
            const endpointId = testUtils.generateRandomBytes32();
            const requester = testUtils.generateRandomAddress();
            const whitelistExtension = 7 * 24 * 60 * 60;
            await requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.maintainer)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
            await requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
            await expect(
              requesterAuthorizerWhitelisterWithTokenPayment
                .connect(roles.payer)
                .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
            ).to.be.revertedWith('Requester blocked');
          });
        });
      });
      context('Requester address is zero', function () {
        it('reverts', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = hre.ethers.constants.AddressZero;
          const whitelistExtension = 7 * 24 * 60 * 60;
          await requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await expect(
            requesterAuthorizerWhitelisterWithTokenPayment
              .connect(roles.payer)
              .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
          ).to.be.revertedWith('Requester address zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const endpointId = testUtils.generateRandomBytes32();
        const requester = testUtils.generateRandomAddress();
        const whitelistExtension = 7 * 24 * 60 * 60;
        await requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
        await expect(
          requesterAuthorizerWhitelisterWithTokenPayment
            .connect(roles.payer)
            .payTokens(roles.airnode.address, 0, endpointId, requester, whitelistExtension)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Airnode is not active', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      const whitelistExtension = 7 * 24 * 60 * 60;
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.payer)
          .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension)
      ).to.be.revertedWith('Airnode not active');
    });
  });
});

describe('resetWhitelistExpirationOfBlockedRequester', function () {
  context('Requester is blocked globally', function () {
    it('resets whitelist expiration of blocked requester', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      const whitelistExtension = 7 * 24 * 60 * 60;
      const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
      await airnodeEndpointPriceRegistry
        .connect(roles.manager)
        .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
      await requesterAuthorizerWhitelisterWithTokenPayment
        .connect(roles.maintainer)
        .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
      await token
        .connect(roles.payer)
        .approve(requesterAuthorizerWhitelisterWithTokenPayment.address, hre.ethers.utils.parseEther('1'));
      const nextTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextTimestamp]);
      await requesterAuthorizerWhitelisterWithTokenPayment
        .connect(roles.payer)
        .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension);
      await requesterAuthorizerWhitelisterWithTokenPayment
        .connect(roles.blocker)
        .setRequesterBlockStatus(requester, true);
      let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
        roles.airnode.address,
        endpointId,
        requester
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(nextTimestamp + whitelistExtension);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.randomPerson)
          .resetWhitelistExpirationOfBlockedRequester(roles.airnode.address, chainId, endpointId, requester)
      )
        .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'ResetWhitelistExpirationOfBlockedRequester')
        .withArgs(roles.airnode.address, chainId, endpointId, requester, roles.randomPerson.address);
      whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
        roles.airnode.address,
        endpointId,
        requester
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Requester is blocked for Airnode', function () {
    it('resets whitelist expiration of blocked requester', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      const whitelistExtension = 7 * 24 * 60 * 60;
      const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
      await airnodeEndpointPriceRegistry
        .connect(roles.manager)
        .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
      await requesterAuthorizerWhitelisterWithTokenPayment
        .connect(roles.maintainer)
        .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
      await token
        .connect(roles.payer)
        .approve(requesterAuthorizerWhitelisterWithTokenPayment.address, hre.ethers.utils.parseEther('1'));
      const nextTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 1;
      await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextTimestamp]);
      await requesterAuthorizerWhitelisterWithTokenPayment
        .connect(roles.payer)
        .payTokens(roles.airnode.address, chainId, endpointId, requester, whitelistExtension);
      await requesterAuthorizerWhitelisterWithTokenPayment
        .connect(roles.blocker)
        .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
      let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
        roles.airnode.address,
        endpointId,
        requester
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(nextTimestamp + whitelistExtension);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.randomPerson)
          .resetWhitelistExpirationOfBlockedRequester(roles.airnode.address, chainId, endpointId, requester)
      )
        .to.emit(requesterAuthorizerWhitelisterWithTokenPayment, 'ResetWhitelistExpirationOfBlockedRequester')
        .withArgs(roles.airnode.address, chainId, endpointId, requester, roles.randomPerson.address);
      whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
        roles.airnode.address,
        endpointId,
        requester
      );
      expect(whitelistStatus.expirationTimestamp).to.equal(0);
      expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
    });
  });
  context('Requester is not blocked globally or for the Airnode', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment
          .connect(roles.randomPerson)
          .resetWhitelistExpirationOfBlockedRequester(roles.airnode.address, chainId, endpointId, requester)
      ).to.be.revertedWith('Requester not blocked');
    });
  });
});

describe('getTokenPaymentAmount', function () {
  context('Price registry returns a value', function () {
    it('gets token payment amount', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const whitelistExtension = 7 * 24 * 60 * 60;
      const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
      await airnodeEndpointPriceRegistry
        .connect(roles.manager)
        .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
      // $100 times 2 divided by $5 divided by 4 = ~10 tokens with 12 decimals (because the token was defined to have 12 decimals)
      const expectedTokenAmount = price
        .mul(priceCoefficient)
        .div(tokenPrice)
        .mul(whitelistExtension)
        .div(30 * 24 * 60 * 60);
      expect(
        await requesterAuthorizerWhitelisterWithTokenPayment.getTokenPaymentAmount(
          roles.airnode.address,
          chainId,
          endpointId,
          whitelistExtension
        )
      ).to.equal(expectedTokenAmount);
    });
  });
  context('Price registry reverts', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const whitelistExtension = 7 * 24 * 60 * 60;
      await expect(
        requesterAuthorizerWhitelisterWithTokenPayment.getTokenPaymentAmount(
          roles.airnode.address,
          chainId,
          endpointId,
          whitelistExtension
        )
      ).to.be.revertedWith('No default price set');
    });
  });
});
