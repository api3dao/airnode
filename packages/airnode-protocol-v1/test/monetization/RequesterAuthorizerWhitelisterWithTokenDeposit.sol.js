/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry,
  airnodeEndpointPriceRegistry,
  requesterAuthorizerRegistry,
  requesterAuthorizerWithManager,
  requesterAuthorizerWhitelisterWithTokenDeposit,
  token;
let requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription =
  'RequesterAuthorizerWhitelisterWithTokenDeposit admin';
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
    depositor: accounts[6],
    anotherDepositor: accounts[7],
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
  const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerWhitelisterWithTokenDeposit',
    roles.deployer
  );
  requesterAuthorizerWhitelisterWithTokenDeposit = await requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
    accessControlRegistry.address,
    requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
  const indefiniteWhitelisterRole = await requesterAuthorizerWithManager.indefiniteWhitelisterRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      await requesterAuthorizerWithManager.adminRole(),
      await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION()
    );
  await accessControlRegistry
    .connect(roles.manager)
    .grantRole(indefiniteWhitelisterRole, requesterAuthorizerWhitelisterWithTokenDeposit.address);

  const adminRole = await requesterAuthorizerWhitelisterWithTokenDeposit.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      managerRootRole,
      requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription
    );
  const maintainerRole = await requesterAuthorizerWhitelisterWithTokenDeposit.maintainerRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      adminRole,
      await requesterAuthorizerWhitelisterWithTokenDeposit.MAINTAINER_ROLE_DESCRIPTION()
    );
  await accessControlRegistry.connect(roles.manager).grantRole(maintainerRole, roles.maintainer.address);
  const blockerRole = await requesterAuthorizerWhitelisterWithTokenDeposit.blockerRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(
      adminRole,
      await requesterAuthorizerWhitelisterWithTokenDeposit.BLOCKER_ROLE_DESCRIPTION()
    );
  await accessControlRegistry.connect(roles.manager).grantRole(blockerRole, roles.blocker.address);
  await token.connect(roles.deployer).transfer(roles.depositor.address, hre.ethers.utils.parseEther('1'));
  await token.connect(roles.deployer).transfer(roles.anotherDepositor.address, hre.ethers.utils.parseEther('1'));
});

describe('constructor', function () {
  context('Token address is not zero', function () {
    context('Token price is not zero', function () {
      context('Price coefficient is not zero', function () {
        context('Proceeds destination is not zero', function () {
          context('Price denomination matches with the registry', function () {
            context('Price decimals matches with the registry', function () {
              it('constructs', async function () {
                const adminRole = await requesterAuthorizerWhitelisterWithTokenDeposit.adminRole();
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.MAINTAINER_ROLE_DESCRIPTION()).to.equal(
                  'Maintainer'
                );
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.maintainerRole()).to.equal(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(
                      ['bytes32', 'bytes32'],
                      [adminRole, hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['string'], ['Maintainer']))]
                    )
                  )
                );
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.BLOCKER_ROLE_DESCRIPTION()).to.equal(
                  'Blocker'
                );
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.blockerRole()).to.equal(
                  hre.ethers.utils.keccak256(
                    hre.ethers.utils.solidityPack(
                      ['bytes32', 'bytes32'],
                      [adminRole, hre.ethers.utils.keccak256(hre.ethers.utils.solidityPack(['string'], ['Blocker']))]
                    )
                  )
                );
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.token()).to.equal(token.address);
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.tokenPrice()).to.equal(tokenPrice);
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.priceCoefficient()).to.equal(
                  priceCoefficient
                );
                expect(await requesterAuthorizerWhitelisterWithTokenDeposit.proceedsDestination()).to.equal(
                  roles.proceedsDestination.address
                );
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
                const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
                  'RequesterAuthorizerWhitelisterWithTokenDeposit',
                  roles.deployer
                );
                await expect(
                  requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
                    accessControlRegistry.address,
                    requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
              const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
                'RequesterAuthorizerWhitelisterWithTokenDeposit',
                roles.deployer
              );
              await expect(
                requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
                  accessControlRegistry.address,
                  requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
            const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
              'RequesterAuthorizerWhitelisterWithTokenDeposit',
              roles.deployer
            );
            await expect(
              requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
                accessControlRegistry.address,
                requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
          const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
            'RequesterAuthorizerWhitelisterWithTokenDeposit',
            roles.deployer
          );
          await expect(
            requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
              accessControlRegistry.address,
              requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
        const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
          'RequesterAuthorizerWhitelisterWithTokenDeposit',
          roles.deployer
        );
        await expect(
          requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
            accessControlRegistry.address,
            requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
      const requesterAuthorizerWhitelisterWithTokenDepositFactory = await hre.ethers.getContractFactory(
        'RequesterAuthorizerWhitelisterWithTokenDeposit',
        roles.deployer
      );
      await expect(
        requesterAuthorizerWhitelisterWithTokenDepositFactory.deploy(
          accessControlRegistry.address,
          requesterAuthorizerWhitelisterWithTokenDepositAdminRoleDescription,
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
        await expect(requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.maintainer).setTokenPrice(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetTokenPrice')
          .withArgs(123, roles.maintainer.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.tokenPrice()).to.equal(123);
      });
    });
    context('Token price is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.maintainer).setTokenPrice(0)
        ).to.be.revertedWith('Token price zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Token price is not zero', function () {
      it('sets token price', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.manager).setTokenPrice(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetTokenPrice')
          .withArgs(123, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.tokenPrice()).to.equal(123);
      });
    });
    context('Token price is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.manager).setTokenPrice(0)
        ).to.be.revertedWith('Token price zero');
      });
    });
  });
  context('Sender is not maintainer and manager', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.randomPerson).setTokenPrice(123)
      ).to.be.revertedWith('Sender cannot maintain');
    });
  });
});

describe('setPriceCoefficient', function () {
  context('Sender is maintainer', function () {
    context('Price coefficient is not zero', function () {
      it('sets price coefficient', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.maintainer).setPriceCoefficient(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetPriceCoefficient')
          .withArgs(123, roles.maintainer.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.priceCoefficient()).to.equal(123);
      });
    });
    context('Price coefficient is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.maintainer).setPriceCoefficient(0)
        ).to.be.revertedWith('Price coefficient zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Price coefficient is not zero', function () {
      it('sets price coefficient', async function () {
        await expect(requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.manager).setPriceCoefficient(123))
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetPriceCoefficient')
          .withArgs(123, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.priceCoefficient()).to.equal(123);
      });
    });
    context('Price coefficient is zero', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.manager).setPriceCoefficient(0)
        ).to.be.revertedWith('Price coefficient zero');
      });
    });
  });
  context('Sender is not maintainer and manager', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.randomPerson).setPriceCoefficient(123)
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
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetAirnodeParticipationStatus')
            .withArgs(roles.airnode.address, AirnodeParticipationStatus.OptedOut, roles.airnode.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToParticipationStatus(roles.airnode.address)
          ).to.equal(AirnodeParticipationStatus.OptedOut);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetAirnodeParticipationStatus')
            .withArgs(roles.airnode.address, AirnodeParticipationStatus.Inactive, roles.airnode.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToParticipationStatus(roles.airnode.address)
          ).to.equal(AirnodeParticipationStatus.Inactive);
        });
      });
      context('Status is Active', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
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
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Active, roles.maintainer.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Active);
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Inactive, roles.maintainer.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Inactive);
          });
        });
        context('Airnode has opted out', function () {
          it('reverts', async function () {
            await requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut);
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            ).to.be.revertedWith('Airnode opted out');
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            ).to.be.revertedWith('Airnode opted out');
          });
        });
      });
      context('Status is OptedOut', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
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
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Active, roles.manager.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Active);
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            )
              .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetAirnodeParticipationStatus')
              .withArgs(roles.airnode.address, AirnodeParticipationStatus.Inactive, roles.manager.address);
            expect(
              await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToParticipationStatus(roles.airnode.address)
            ).to.equal(AirnodeParticipationStatus.Inactive);
          });
        });
        context('Airnode has opted out', function () {
          it('reverts', async function () {
            await requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.airnode)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut);
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
            ).to.be.revertedWith('Airnode opted out');
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.manager)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
            ).to.be.revertedWith('Airnode opted out');
          });
        });
      });
      context('Status is OptedOut', function () {
        it('reverts', async function () {
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.manager)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
          ).to.be.revertedWith('Only Airnode can opt out');
        });
      });
    });
    context('Sender is not maintainer and manager', function () {
      it('reverts', async function () {
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.randomPerson)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Inactive)
        ).to.be.revertedWith('Sender cannot maintain');
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.randomPerson)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active)
        ).to.be.revertedWith('Sender cannot maintain');
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.randomPerson)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.OptedOut)
        ).to.be.revertedWith('Sender cannot maintain');
      });
    });
  });
  context('Airnode address is zero', function () {
    it('reverts', async function () {
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(hre.ethers.constants.AddressZero, AirnodeParticipationStatus.Inactive)
      ).to.be.revertedWith('Airnode address zero');
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(hre.ethers.constants.AddressZero, AirnodeParticipationStatus.Active)
      ).to.be.revertedWith('Airnode address zero');
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
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
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.manager)
            .setProceedsDestination(proceedsDestination)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetProceedsDestination')
          .withArgs(proceedsDestination);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.proceedsDestination()).to.equal(
          proceedsDestination
        );
      });
    });
    context('Proceeds destination is zero', function () {
      it('reverts', async function () {
        const proceedsDestination = hre.ethers.constants.AddressZero;
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
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
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.randomPerson)
          .setProceedsDestination(proceedsDestination)
      ).to.be.revertedWith('Sender not manager');
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
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
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.blocker).setRequesterBlockStatus(requester, true)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatus')
          .withArgs(requester, true, roles.blocker.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.requesterToBlockStatus(requester)).to.equal(true);
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.blocker)
            .setRequesterBlockStatus(requester, false)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatus')
          .withArgs(requester, false, roles.blocker.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.requesterToBlockStatus(requester)).to.equal(false);
      });
    });
    context('Requester address is zero', function () {
      it('reverts', async function () {
        const requester = hre.ethers.constants.AddressZero;
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.blocker).setRequesterBlockStatus(requester, true)
        ).to.be.revertedWith('Requester address zero');
      });
    });
  });
  context('Sender is manager', function () {
    context('Requester address is not zero', function () {
      it('sets requester block status', async function () {
        const requester = testUtils.generateRandomAddress();
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.manager).setRequesterBlockStatus(requester, true)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatus')
          .withArgs(requester, true, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.requesterToBlockStatus(requester)).to.equal(true);
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.manager)
            .setRequesterBlockStatus(requester, false)
        )
          .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatus')
          .withArgs(requester, false, roles.manager.address);
        expect(await requesterAuthorizerWhitelisterWithTokenDeposit.requesterToBlockStatus(requester)).to.equal(false);
      });
    });
    context('Requester address is zero', function () {
      it('reverts', async function () {
        const requester = hre.ethers.constants.AddressZero;
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit.connect(roles.manager).setRequesterBlockStatus(requester, true)
        ).to.be.revertedWith('Requester address zero');
      });
    });
  });
  context('Sender is not maintainer and blocker', function () {
    it('reverts', async function () {
      const requester = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
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
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, true, roles.blocker.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToRequesterToBlockStatus(
              roles.airnode.address,
              requester
            )
          ).to.equal(true);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, false)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, false, roles.blocker.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToRequesterToBlockStatus(
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
            requesterAuthorizerWhitelisterWithTokenDeposit
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
          requesterAuthorizerWhitelisterWithTokenDeposit
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
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.manager)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, true, roles.manager.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToRequesterToBlockStatus(
              roles.airnode.address,
              requester
            )
          ).to.equal(true);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.manager)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, false)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'SetRequesterBlockStatusForAirnode')
            .withArgs(roles.airnode.address, requester, false, roles.manager.address);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToRequesterToBlockStatus(
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
            requesterAuthorizerWhitelisterWithTokenDeposit
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
          requesterAuthorizerWhitelisterWithTokenDeposit
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
        requesterAuthorizerWhitelisterWithTokenDeposit
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
        await requesterAuthorizerWhitelisterWithTokenDeposit.getTokenAmount(roles.airnode.address, chainId, endpointId)
      ).to.equal(expectedTokenAmount);
    });
  });
  context('Price registry reverts', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit.getTokenAmount(roles.airnode.address, chainId, endpointId)
      ).to.be.revertedWith('No default price set');
    });
  });
});

describe('depositTokens', function () {
  context('Airnode is active', function () {
    context('Chain ID is not zero', function () {
      context('Requester address is not zero', function () {
        context('Requester is not blocked globally or for the Airnode', function () {
          context('Sender has not already deposited tokens', function () {
            context('Token transfer is successful', function () {
              context('Tokens were not deposited for the requester-endpoint pair before', function () {
                context('RequesterAuthorizer for the chain is set', function () {
                  it('indefinitely whitelists the requester for the endpoint, increments the number of times tokens were deposited for the requester-endpoint pair and deposits tokens', async function () {
                    const endpointId = testUtils.generateRandomBytes32();
                    const requester = testUtils.generateRandomAddress();
                    const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                    const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
                    await airnodeEndpointPriceRegistry
                      .connect(roles.manager)
                      .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
                    await requesterAuthorizerWhitelisterWithTokenDeposit
                      .connect(roles.maintainer)
                      .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                    await token
                      .connect(roles.depositor)
                      .approve(
                        requesterAuthorizerWhitelisterWithTokenDeposit.address,
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
                    await expect(
                      requesterAuthorizerWhitelisterWithTokenDeposit
                        .connect(roles.depositor)
                        .depositTokens(roles.airnode.address, chainId, endpointId, requester)
                    )
                      .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'DepositedTokens')
                      .withArgs(
                        roles.airnode.address,
                        chainId,
                        endpointId,
                        requester,
                        roles.depositor.address,
                        1,
                        expectedTokenAmount
                      );
                    expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(
                      expectedTokenAmount
                    );
                    expect(await token.balanceOf(roles.depositor.address)).to.equal(
                      hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
                    );
                    expect(
                      await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
                        roles.airnode.address,
                        chainId,
                        endpointId,
                        requester
                      )
                    ).to.equal(1);
                    expect(
                      await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
                        roles.airnode.address,
                        chainId,
                        endpointId,
                        requester,
                        roles.depositor.address
                      )
                    ).to.equal(expectedTokenAmount);
                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        requester
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
                  });
                });
                context('RequesterAuthorizer for the chain is not set', function () {
                  it('reverts', async function () {
                    const anotherChainId = chainId + 1;
                    const endpointId = testUtils.generateRandomBytes32();
                    const requester = testUtils.generateRandomAddress();
                    const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                    await airnodeEndpointPriceRegistry
                      .connect(roles.manager)
                      .registerAirnodeChainEndpointPrice(roles.airnode.address, anotherChainId, endpointId, price);
                    await requesterAuthorizerWhitelisterWithTokenDeposit
                      .connect(roles.maintainer)
                      .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                    await token
                      .connect(roles.depositor)
                      .approve(
                        requesterAuthorizerWhitelisterWithTokenDeposit.address,
                        hre.ethers.utils.parseEther('1')
                      );
                    await expect(
                      requesterAuthorizerWhitelisterWithTokenDeposit
                        .connect(roles.depositor)
                        .depositTokens(roles.airnode.address, anotherChainId, endpointId, requester)
                    ).to.be.revertedWith('No Authorizer set for chain');
                  });
                });
              });
              context('Tokens were deposited for the requester-endpoint pair before', function () {
                it('increments the number of times tokens were deposited for the requester-endpoint pair and deposits tokens', async function () {
                  const endpointId = testUtils.generateRandomBytes32();
                  const requester = testUtils.generateRandomAddress();
                  const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                  const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
                  await airnodeEndpointPriceRegistry
                    .connect(roles.manager)
                    .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
                  await requesterAuthorizerWhitelisterWithTokenDeposit
                    .connect(roles.maintainer)
                    .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                  await token
                    .connect(roles.anotherDepositor)
                    .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
                  await requesterAuthorizerWhitelisterWithTokenDeposit
                    .connect(roles.anotherDepositor)
                    .depositTokens(roles.airnode.address, chainId, endpointId, requester);
                  let whitelistStatus =
                    await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                      roles.airnode.address,
                      endpointId,
                      requester
                    );
                  expect(whitelistStatus.expirationTimestamp).to.equal(0);
                  expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
                  expect(
                    await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
                      roles.airnode.address,
                      chainId,
                      endpointId,
                      requester
                    )
                  ).to.equal(1);
                  await token
                    .connect(roles.depositor)
                    .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
                  await expect(
                    requesterAuthorizerWhitelisterWithTokenDeposit
                      .connect(roles.depositor)
                      .depositTokens(roles.airnode.address, chainId, endpointId, requester)
                  )
                    .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'DepositedTokens')
                    .withArgs(
                      roles.airnode.address,
                      chainId,
                      endpointId,
                      requester,
                      roles.depositor.address,
                      2,
                      expectedTokenAmount
                    );
                  expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(
                    expectedTokenAmount.mul(2)
                  );
                  expect(await token.balanceOf(roles.depositor.address)).to.equal(
                    hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
                  );
                  expect(
                    await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
                      roles.airnode.address,
                      chainId,
                      endpointId,
                      requester
                    )
                  ).to.equal(2);
                  expect(
                    await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
                      roles.airnode.address,
                      chainId,
                      endpointId,
                      requester,
                      roles.depositor.address
                    )
                  ).to.equal(expectedTokenAmount);
                  whitelistStatus =
                    await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                      roles.airnode.address,
                      endpointId,
                      requester
                    );
                  expect(whitelistStatus.expirationTimestamp).to.equal(0);
                  expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
                });
              });
            });
            context('Token transfer is not successful', function () {
              it('reverts', async function () {
                const endpointId = testUtils.generateRandomBytes32();
                const requester = testUtils.generateRandomAddress();
                const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
                await airnodeEndpointPriceRegistry
                  .connect(roles.manager)
                  .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
                await requesterAuthorizerWhitelisterWithTokenDeposit
                  .connect(roles.maintainer)
                  .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
                await expect(
                  requesterAuthorizerWhitelisterWithTokenDeposit
                    .connect(roles.depositor)
                    .depositTokens(roles.airnode.address, chainId, endpointId, requester)
                ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
              });
            });
          });
          context('Sender has already deposited tokens', function () {
            it('reverts', async function () {
              const endpointId = testUtils.generateRandomBytes32();
              const requester = testUtils.generateRandomAddress();
              const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
              await airnodeEndpointPriceRegistry
                .connect(roles.manager)
                .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
              await requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.maintainer)
                .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
              await token
                .connect(roles.depositor)
                .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
              await requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.depositor)
                .depositTokens(roles.airnode.address, chainId, endpointId, requester);
              await expect(
                requesterAuthorizerWhitelisterWithTokenDeposit
                  .connect(roles.depositor)
                  .depositTokens(roles.airnode.address, chainId, endpointId, requester)
              ).to.be.revertedWith('Sender already deposited tokens');
            });
          });
        });
        context('Requester is blocked globally', function () {
          it('reverts', async function () {
            const endpointId = testUtils.generateRandomBytes32();
            const requester = testUtils.generateRandomAddress();
            await requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.maintainer)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
            await requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.blocker)
              .setRequesterBlockStatus(requester, true);
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.depositor)
                .depositTokens(roles.airnode.address, chainId, endpointId, requester)
            ).to.be.revertedWith('Requester blocked');
          });
        });
        context('Requester is blocked for Airnode', function () {
          it('reverts', async function () {
            const endpointId = testUtils.generateRandomBytes32();
            const requester = testUtils.generateRandomAddress();
            await requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.maintainer)
              .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
            await requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.blocker)
              .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
            await expect(
              requesterAuthorizerWhitelisterWithTokenDeposit
                .connect(roles.depositor)
                .depositTokens(roles.airnode.address, chainId, endpointId, requester)
            ).to.be.revertedWith('Requester blocked');
          });
        });
      });
      context('Requester address is zero', function () {
        it('reverts', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = hre.ethers.constants.AddressZero;
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.depositor)
              .depositTokens(roles.airnode.address, chainId, endpointId, requester)
          ).to.be.revertedWith('Requester address zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const endpointId = testUtils.generateRandomBytes32();
        const requester = testUtils.generateRandomAddress();
        await requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, 0, endpointId, requester)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Airnode is not active', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.depositor)
          .depositTokens(roles.airnode.address, chainId, endpointId, requester)
      ).to.be.revertedWith('Airnode not active');
    });
  });
});

describe('withdrawTokens', function () {
  context('Requester is not blocked globally or for the Airnode', function () {
    context('Sender has deposited tokens', function () {
      context('Withdrawn deposit was the last one for the requester-endpoint pair', function () {
        it('removes the indefinite whitelist of the requester for the endpoint, decrements the number of times tokens were deposited for the requester-endpoint pair and withdraws tokens', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = testUtils.generateRandomAddress();
          const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
          const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
          await airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await token
            .connect(roles.depositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.depositor)
              .withdrawTokens(roles.airnode.address, chainId, endpointId, requester)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'WithdrewTokens')
            .withArgs(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address,
              0,
              expectedTokenAmount
            );
          expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(0);
          expect(await token.balanceOf(roles.depositor.address)).to.equal(hre.ethers.utils.parseEther('1'));
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester
            )
          ).to.equal(0);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
          ).to.equal(0);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Withdrawn deposit was not the last one for the requester-endpoint pair', function () {
        it('decrements the number of times tokens were deposited for the requester-endpoint pair and withdraws tokens', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = testUtils.generateRandomAddress();
          const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
          const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
          await airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await token
            .connect(roles.depositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await token
            .connect(roles.anotherDepositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.anotherDepositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.depositor)
              .withdrawTokens(roles.airnode.address, chainId, endpointId, requester)
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'WithdrewTokens')
            .withArgs(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address,
              1,
              expectedTokenAmount
            );
          expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(
            expectedTokenAmount
          );
          expect(await token.balanceOf(roles.depositor.address)).to.equal(hre.ethers.utils.parseEther('1'));
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester
            )
          ).to.equal(1);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
          ).to.equal(0);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        });
      });
    });
    context('Sender has not deposited tokens', function () {
      it('reverts', async function () {
        const endpointId = testUtils.generateRandomBytes32();
        const requester = testUtils.generateRandomAddress();
        const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
        await airnodeEndpointPriceRegistry
          .connect(roles.manager)
          .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
        await requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .withdrawTokens(roles.airnode.address, chainId, endpointId, requester)
        ).to.be.revertedWith('Sender has not deposited tokens');
      });
    });
  });
  context('Requester is blocked globally', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      await requesterAuthorizerWhitelisterWithTokenDeposit
        .connect(roles.maintainer)
        .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
      await requesterAuthorizerWhitelisterWithTokenDeposit
        .connect(roles.blocker)
        .setRequesterBlockStatus(requester, true);
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.depositor)
          .withdrawTokens(roles.airnode.address, chainId, endpointId, requester)
      ).to.be.revertedWith('Requester blocked');
    });
  });
  context('Requester is blocked for Airnode', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      await requesterAuthorizerWhitelisterWithTokenDeposit
        .connect(roles.maintainer)
        .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
      await requesterAuthorizerWhitelisterWithTokenDeposit
        .connect(roles.blocker)
        .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.depositor)
          .withdrawTokens(roles.airnode.address, chainId, endpointId, requester)
      ).to.be.revertedWith('Requester blocked');
    });
  });
});

describe('withdrawFundsDepositedForBlockedRequester', function () {
  context('Requester is blocked globally', function () {
    context('depositor has deposited tokens', function () {
      context('Withdrawn deposit was the last one for the requester-endpoint pair', function () {
        it('removes the indefinite whitelist of the requester for the endpoint, decrements the number of times tokens were deposited for the requester-endpoint pair and withdraws tokens to the proceeds destination', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = testUtils.generateRandomAddress();
          const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
          const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
          await airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await token
            .connect(roles.depositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.blocker)
            .setRequesterBlockStatus(requester, true);
          let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.randomPerson)
              .withdrawFundsDepositedForBlockedRequester(
                roles.airnode.address,
                chainId,
                endpointId,
                requester,
                roles.depositor.address
              )
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'WithdrewTokensDepositedForBlockedRequester')
            .withArgs(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address,
              0,
              expectedTokenAmount
            );
          expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(0);
          expect(await token.balanceOf(roles.depositor.address)).to.equal(
            hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
          );
          expect(await token.balanceOf(roles.proceedsDestination.address)).to.equal(expectedTokenAmount);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester
            )
          ).to.equal(0);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
          ).to.equal(0);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Withdrawn deposit was not the last one for the requester-endpoint pair', function () {
        it('decrements the number of times tokens were deposited for the requester-endpoint pair and withdraws tokens to the proceeds destination', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = testUtils.generateRandomAddress();
          const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
          const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
          await airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await token
            .connect(roles.depositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await token
            .connect(roles.anotherDepositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.anotherDepositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.blocker)
            .setRequesterBlockStatus(requester, true);
          let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.randomPerson)
              .withdrawFundsDepositedForBlockedRequester(
                roles.airnode.address,
                chainId,
                endpointId,
                requester,
                roles.depositor.address
              )
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'WithdrewTokensDepositedForBlockedRequester')
            .withArgs(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address,
              1,
              expectedTokenAmount
            );
          expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(
            expectedTokenAmount
          );
          expect(await token.balanceOf(roles.depositor.address)).to.equal(
            hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
          );
          expect(await token.balanceOf(roles.proceedsDestination.address)).to.equal(expectedTokenAmount);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester
            )
          ).to.equal(1);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
          ).to.equal(0);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        });
      });
    });
    context('depositor has not deposited tokens', function () {
      it('reverts', async function () {
        const endpointId = testUtils.generateRandomBytes32();
        const requester = testUtils.generateRandomAddress();
        await requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
        await requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.blocker)
          .setRequesterBlockStatus(requester, true);
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.randomPerson)
            .withdrawFundsDepositedForBlockedRequester(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
        ).to.be.revertedWith('Depositor has not deposited');
      });
    });
  });
  context('Requester is blocked for Airnode', function () {
    context('depositor has deposited tokens', function () {
      context('Withdrawn deposit was the last one for the requester-endpoint pair', function () {
        it('removes the indefinite whitelist of the requester for the endpoint, decrements the number of times tokens were deposited for the requester-endpoint pair and withdraws tokens to the proceeds destination', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = testUtils.generateRandomAddress();
          const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
          const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
          await airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await token
            .connect(roles.depositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.blocker)
            .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
          let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.randomPerson)
              .withdrawFundsDepositedForBlockedRequester(
                roles.airnode.address,
                chainId,
                endpointId,
                requester,
                roles.depositor.address
              )
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'WithdrewTokensDepositedForBlockedRequester')
            .withArgs(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address,
              0,
              expectedTokenAmount
            );
          expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(0);
          expect(await token.balanceOf(roles.depositor.address)).to.equal(
            hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
          );
          expect(await token.balanceOf(roles.proceedsDestination.address)).to.equal(expectedTokenAmount);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester
            )
          ).to.equal(0);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
          ).to.equal(0);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
        });
      });
      context('Withdrawn deposit was not the last one for the requester-endpoint pair', function () {
        it('decrements the number of times tokens were deposited for the requester-endpoint pair and withdraws tokens to the proceeds destination', async function () {
          const endpointId = testUtils.generateRandomBytes32();
          const requester = testUtils.generateRandomAddress();
          const price = hre.ethers.BigNumber.from(`100${'0'.repeat(18)}`); // $100
          const expectedTokenAmount = price.mul(priceCoefficient).div(tokenPrice);
          await airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(roles.airnode.address, chainId, endpointId, price);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.maintainer)
            .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
          await token
            .connect(roles.depositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.depositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await token
            .connect(roles.anotherDepositor)
            .approve(requesterAuthorizerWhitelisterWithTokenDeposit.address, hre.ethers.utils.parseEther('1'));
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.anotherDepositor)
            .depositTokens(roles.airnode.address, chainId, endpointId, requester);
          await requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.blocker)
            .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
          let whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
          await expect(
            requesterAuthorizerWhitelisterWithTokenDeposit
              .connect(roles.randomPerson)
              .withdrawFundsDepositedForBlockedRequester(
                roles.airnode.address,
                chainId,
                endpointId,
                requester,
                roles.depositor.address
              )
          )
            .to.emit(requesterAuthorizerWhitelisterWithTokenDeposit, 'WithdrewTokensDepositedForBlockedRequester')
            .withArgs(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address,
              1,
              expectedTokenAmount
            );
          expect(await token.balanceOf(requesterAuthorizerWhitelisterWithTokenDeposit.address)).to.equal(
            expectedTokenAmount
          );
          expect(await token.balanceOf(roles.depositor.address)).to.equal(
            hre.ethers.utils.parseEther('1').sub(expectedTokenAmount)
          );
          expect(await token.balanceOf(roles.proceedsDestination.address)).to.equal(expectedTokenAmount);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositsCount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester
            )
          ).to.equal(1);
          expect(
            await requesterAuthorizerWhitelisterWithTokenDeposit.airnodeToChainIdToEndpointIdToRequesterToTokenDepositorToAmount(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
          ).to.equal(0);
          whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
            roles.airnode.address,
            endpointId,
            requester
          );
          expect(whitelistStatus.expirationTimestamp).to.equal(0);
          expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
        });
      });
    });
    context('depositor has not deposited tokens', function () {
      it('reverts', async function () {
        const endpointId = testUtils.generateRandomBytes32();
        const requester = testUtils.generateRandomAddress();
        await requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.maintainer)
          .setAirnodeParticipationStatus(roles.airnode.address, AirnodeParticipationStatus.Active);
        await requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.blocker)
          .setRequesterBlockStatusForAirnode(roles.airnode.address, requester, true);
        await expect(
          requesterAuthorizerWhitelisterWithTokenDeposit
            .connect(roles.randomPerson)
            .withdrawFundsDepositedForBlockedRequester(
              roles.airnode.address,
              chainId,
              endpointId,
              requester,
              roles.depositor.address
            )
        ).to.be.revertedWith('Depositor has not deposited');
      });
    });
  });
  context('Requester is not blocked globally or for the Airnode', function () {
    it('reverts', async function () {
      const endpointId = testUtils.generateRandomBytes32();
      const requester = testUtils.generateRandomAddress();
      await expect(
        requesterAuthorizerWhitelisterWithTokenDeposit
          .connect(roles.randomPerson)
          .withdrawFundsDepositedForBlockedRequester(
            roles.airnode.address,
            chainId,
            endpointId,
            requester,
            roles.depositor.address
          )
      ).to.be.revertedWith('Requester not blocked');
    });
  });
});
