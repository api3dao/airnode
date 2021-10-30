/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../../utils');

let roles;
let accessControlRegistry, airnodeFeeRegistry;
let airnodeFeeRegistryAdminRoleDescription = 'AirnodeFeeRegistry admin';
let adminRole;
let airnodeAddress = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();
let decimals;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    globalDefaultPriceSetter: accounts[2],
    airnodeFlagAndPriceSetter: accounts[3],
    anotherAirnodeFlagAndPriceSetterRole: accounts[5],
    requester: accounts[5],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
  airnodeFeeRegistry = await airnodeFeeRegistryFactory.deploy(
    accessControlRegistry.address,
    airnodeFeeRegistryAdminRoleDescription,
    roles.manager.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  adminRole = await airnodeFeeRegistry.adminRole();
  // globalDefaultPriceSetterRole = await airnodeFeeRegistry.globalDefaultPriceSetterRole();
  // airnodeFlagAndPriceSetterRole = await airnodeFeeRegistry.airnodeFlagAndPriceSetterRole();
  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole, adminRole],
    [
      airnodeFeeRegistryAdminRoleDescription,
      await airnodeFeeRegistry.GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION(),
      await airnodeFeeRegistry.AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION(),
      await airnodeFeeRegistry.AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION(),
    ],
    [
      roles.manager.address, // which will already have been granted the role
      roles.globalDefaultPriceSetter.address,
      roles.airnodeFlagAndPriceSetter.address,
      roles.anotherAirnodeFlagAndPriceSetterRole.address,
    ]
  );
  // Grant `roles.randomPerson` some invalid roles
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [managerRootRole, managerRootRole, managerRootRole],
      [
        Math.random(),
        await airnodeFeeRegistry.GLOBAL_DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION(),
        await airnodeFeeRegistry.AIRNODE_FLAG_AND_PRICE_SETTER_DESCRIPTION(),
      ],
      [roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address]
    );

  decimals = await airnodeFeeRegistry.decimals();
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    context('Admin role description string is not empty', function () {
      context('Manager address is not zero', function () {
        it('constructs', async function () {
          const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
          airnodeFeeRegistry = await airnodeFeeRegistryFactory.deploy(
            accessControlRegistry.address,
            airnodeFeeRegistryAdminRoleDescription,
            roles.manager.address
          );
          expect(await airnodeFeeRegistry.accessControlRegistry()).to.equal(accessControlRegistry.address);
          expect(await airnodeFeeRegistry.adminRoleDescription()).to.equal(airnodeFeeRegistryAdminRoleDescription);
          expect(await airnodeFeeRegistry.manager()).to.equal(roles.manager.address);
        });
      });
      context('Manager address is zero', function () {
        it('reverts', async function () {
          const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
          await expect(
            airnodeFeeRegistryFactory.deploy(
              accessControlRegistry.address,
              airnodeFeeRegistryAdminRoleDescription,
              hre.ethers.constants.AddressZero
            )
          ).to.be.revertedWith('Manager address zero');
        });
      });
    });
    context('Admin role description string is empty', function () {
      it('reverts', async function () {
        const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
        await expect(
          airnodeFeeRegistryFactory.deploy(accessControlRegistry.address, '', roles.manager.address)
        ).to.be.revertedWith('Admin role description empty');
      });
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
      await expect(
        airnodeFeeRegistryFactory.deploy(
          hre.ethers.constants.AddressZero,
          airnodeFeeRegistryAdminRoleDescription,
          roles.manager.address
        )
      ).to.be.revertedWith('ACR address zero');
    });
  });
});

describe('setAirnodeEndpointFlag', function () {
  context('Sender has airnode flag and price setter role', function () {
    context('AirnodeEndpoint Flag status is being set', function () {
      context('airnode address is valid', function () {
        it('sets the status', async function () {
          let airnodeEndpointFlag;
          airnodeEndpointFlag = await airnodeFeeRegistry.airnodeEndpointFlag(airnodeAddress);
          expect(airnodeEndpointFlag).to.equal(false);
          await expect(
            airnodeFeeRegistry.connect(roles.airnodeFlagAndPriceSetter).setAirnodeEndpointFlag(airnodeAddress, true)
          )
            .to.emit(airnodeFeeRegistry, 'SetAirnodeEndpointFlag')
            .withArgs(airnodeAddress, true, roles.airnodeFlagAndPriceSetter.address);
          airnodeEndpointFlag = await airnodeFeeRegistry.airnodeEndpointFlag(airnodeAddress);
          expect(airnodeEndpointFlag).to.equal(true);
        });
      });
      context('airnode address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setAirnodeEndpointFlag(hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('Address is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setAirnodeEndpointFlag(airnodeAddress, true)
      ).to.be.revertedWith('Not airnode flag and price setter');
    });
  });
});

describe('setDefaultPrice', function () {
  context('Sender has global default price setter role', function () {
    context('default price is being set', function () {
      context('price is valid', function () {
        it('sets the default price', async function () {
          let defaultPrice;
          defaultPrice = await airnodeFeeRegistry.defaultPrice();
          expect(defaultPrice).to.equal(0);
          await expect(airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultPrice(100))
            .to.emit(airnodeFeeRegistry, 'SetDefaultPrice')
            .withArgs(100, roles.globalDefaultPriceSetter.address);
          defaultPrice = await airnodeFeeRegistry.defaultPrice();
          expect(defaultPrice).to.equal(100 * 10 ** decimals);
        });
      });
      context('price is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultPrice(0)
          ).to.be.revertedWith('Price is zero');
        });
      });
    });
  });
  context('Sender does not have the global default price setter role', function () {
    it('reverts', async function () {
      await expect(airnodeFeeRegistry.connect(roles.randomPerson).setDefaultPrice(100)).to.be.revertedWith(
        'Not global default price setter'
      );
    });
  });
});

describe('setDefaultChainPrice', function () {
  context('Sender has global default price setter role', function () {
    context('default price on chain is being set', function () {
      context('chainId is valid', function () {
        context('price is valid', function () {
          it('sets the default price on the chain', async function () {
            let defaultChainPrice;
            defaultChainPrice = await airnodeFeeRegistry.defaultChainPrice(1);
            expect(defaultChainPrice).to.equal(0);
            await expect(airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultChainPrice(1, 100))
              .to.emit(airnodeFeeRegistry, 'SetDefaultChainPrice')
              .withArgs(1, 100, roles.globalDefaultPriceSetter.address);
            defaultChainPrice = await airnodeFeeRegistry.defaultChainPrice(1);
            expect(defaultChainPrice).to.equal(100 * 10 ** decimals);
          });
        });
        context('price is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultChainPrice(1, 0)
            ).to.be.revertedWith('Price is zero');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultChainPrice(0, 100)
          ).to.be.revertedWith('ChainId is zero');
        });
      });
    });
  });
  context('Sender does not have the global default price setter role', function () {
    it('reverts', async function () {
      await expect(airnodeFeeRegistry.connect(roles.randomPerson).setDefaultChainPrice(1, 100)).to.be.revertedWith(
        'Not global default price setter'
      );
    });
  });
});

describe('setDefaultAirnodePrice', function () {
  context('Sender has airnode flag and price setter role', function () {
    context('default price on airnode is being set', function () {
      context('airnode is valid', function () {
        context('price is valid', function () {
          it('sets the default price on the airnode', async function () {
            let defaultAirnodePrice;
            defaultAirnodePrice = await airnodeFeeRegistry.defaultAirnodePrice(airnodeAddress);
            expect(defaultAirnodePrice).to.equal(0);
            await expect(
              airnodeFeeRegistry.connect(roles.airnodeFlagAndPriceSetter).setDefaultAirnodePrice(airnodeAddress, 100)
            )
              .to.emit(airnodeFeeRegistry, 'SetDefaultAirnodePrice')
              .withArgs(airnodeAddress, 100, roles.airnodeFlagAndPriceSetter.address);
            defaultAirnodePrice = await airnodeFeeRegistry.defaultAirnodePrice(airnodeAddress);
            expect(defaultAirnodePrice).to.equal(100 * 10 ** decimals);
          });
        });
        context('price is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry.connect(roles.airnodeFlagAndPriceSetter).setDefaultAirnodePrice(airnodeAddress, 0)
            ).to.be.revertedWith('Price is zero');
          });
        });
      });
      context('airnode is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setDefaultAirnodePrice(hre.ethers.constants.AddressZero, 100)
          ).to.be.revertedWith('Address is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setDefaultAirnodePrice(airnodeAddress, 100)
      ).to.be.revertedWith('Not airnode flag and price setter');
    });
  });
});

describe('setDefaultChainAirnodePrice', function () {
  context('Sender has airnode flag and price setter role', function () {
    context('default price on airnode and chain is being set', function () {
      context('chainId is valid', function () {
        context('airnode is valid', function () {
          context('price is valid', function () {
            it('sets the default price on the airnode', async function () {
              let defaultChainAirnodePrice;
              defaultChainAirnodePrice = await airnodeFeeRegistry.defaultChainAirnodePrice(1, airnodeAddress);
              expect(defaultChainAirnodePrice).to.equal(0);
              await expect(
                airnodeFeeRegistry
                  .connect(roles.airnodeFlagAndPriceSetter)
                  .setDefaultChainAirnodePrice(1, airnodeAddress, 100)
              )
                .to.emit(airnodeFeeRegistry, 'SetDefaultChainAirnodePrice')
                .withArgs(1, airnodeAddress, 100, roles.airnodeFlagAndPriceSetter.address);
              defaultChainAirnodePrice = await airnodeFeeRegistry.defaultChainAirnodePrice(1, airnodeAddress);
              expect(defaultChainAirnodePrice).to.equal(100 * 10 ** decimals);
            });
          });
          context('price is not valid', function () {
            it('reverts', async function () {
              await expect(
                airnodeFeeRegistry
                  .connect(roles.airnodeFlagAndPriceSetter)
                  .setDefaultChainAirnodePrice(1, airnodeAddress, 0)
              ).to.be.revertedWith('Price is zero');
            });
          });
        });
        context('airnode is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setDefaultChainAirnodePrice(1, hre.ethers.constants.AddressZero, 100)
            ).to.be.revertedWith('Address is zero');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setDefaultChainAirnodePrice(0, hre.ethers.constants.AddressZero, 100)
          ).to.be.revertedWith('ChainId is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setDefaultChainAirnodePrice(1, airnodeAddress, 100)
      ).to.be.revertedWith('Not airnode flag and price setter');
    });
  });
});

describe('setAirnodeEndpointPrice', function () {
  context('Sender has airnode flag and price setter role', function () {
    context('default price on airnode and endpoint is being set', function () {
      context('airnode is valid', function () {
        context('price is valid', function () {
          it('sets the default price of airnode endpoint', async function () {
            let airnodeToEndpointToPrice;
            airnodeToEndpointToPrice = await airnodeFeeRegistry.airnodeToEndpointToPrice(airnodeAddress, endpointId);
            expect(airnodeToEndpointToPrice).to.equal(0);
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setAirnodeEndpointPrice(airnodeAddress, endpointId, 100)
            )
              .to.emit(airnodeFeeRegistry, 'SetAirnodeEndpointPrice')
              .withArgs(airnodeAddress, endpointId, 100, roles.airnodeFlagAndPriceSetter.address);
            airnodeToEndpointToPrice = await airnodeFeeRegistry.airnodeToEndpointToPrice(airnodeAddress, endpointId);
            expect(airnodeToEndpointToPrice).to.equal(100 * 10 ** decimals);
          });
        });
        context('price is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setAirnodeEndpointPrice(airnodeAddress, endpointId, 0)
            ).to.be.revertedWith('Price is zero');
          });
        });
      });
      context('airnode is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setAirnodeEndpointPrice(hre.ethers.constants.AddressZero, endpointId, 100)
          ).to.be.revertedWith('Address is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setAirnodeEndpointPrice(airnodeAddress, endpointId, 100)
      ).to.be.revertedWith('Not airnode flag and price setter');
    });
  });
});

describe('setChainAirnodeEndpointPrice', function () {
  context('Sender has airnode flag and price setter role', function () {
    context('default price on chain airnode endpoint is being set', function () {
      context('chainId is valid', function () {
        context('airnode is valid', function () {
          context('price is valid', function () {
            it('sets the default price on the chain airnode endpoint', async function () {
              let chainIdToAirnodeToEndpointToPrice;
              chainIdToAirnodeToEndpointToPrice = await airnodeFeeRegistry.chainIdToAirnodeToEndpointToPrice(
                1,
                airnodeAddress,
                endpointId
              );
              expect(chainIdToAirnodeToEndpointToPrice).to.equal(0);
              await expect(
                airnodeFeeRegistry
                  .connect(roles.airnodeFlagAndPriceSetter)
                  .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 100)
              )
                .to.emit(airnodeFeeRegistry, 'SetChainAirnodeEndpointPrice')
                .withArgs(1, airnodeAddress, endpointId, 100, roles.airnodeFlagAndPriceSetter.address);
              chainIdToAirnodeToEndpointToPrice = await airnodeFeeRegistry.chainIdToAirnodeToEndpointToPrice(
                1,
                airnodeAddress,
                endpointId
              );
              expect(chainIdToAirnodeToEndpointToPrice).to.equal(100 * 10 ** decimals);
            });
          });
          context('price is not valid', function () {
            it('reverts', async function () {
              await expect(
                airnodeFeeRegistry
                  .connect(roles.airnodeFlagAndPriceSetter)
                  .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 0)
              ).to.be.revertedWith('Price is zero');
            });
          });
        });
        context('airnode is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setChainAirnodeEndpointPrice(1, hre.ethers.constants.AddressZero, endpointId, 100)
            ).to.be.revertedWith('Address is zero');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setChainAirnodeEndpointPrice(0, hre.ethers.constants.AddressZero, endpointId, 100)
          ).to.be.revertedWith('ChainId is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 100)
      ).to.be.revertedWith('Not airnode flag and price setter');
    });
  });
});

describe('getEndpointPrice', function () {
  context('chainIdToAirnodeToEndpointToPrice is zero', function () {
    context('airnodeEndpointFlag is set', function () {
      context('airnodeToEndpointToPrice is zero', function () {
        context('defaultChainAirnodePrice is zero', function () {
          context('defaultAirnodePrice is zero', function () {
            context('defaultChainPrice is zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry
                  .connect(roles.airnodeFlagAndPriceSetter)
                  .setAirnodeEndpointFlag(airnodeAddress, true);
                await airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultPrice(100);
                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
                  100 * 10 ** decimals
                );
              });
            });
            context('defaultChainPrice is not zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry
                  .connect(roles.airnodeFlagAndPriceSetter)
                  .setAirnodeEndpointFlag(airnodeAddress, true);
                await airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultChainPrice(1, 100);

                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
                  100 * 10 ** decimals
                );
              });
            });
          });
          context('defaultAirnodePrice is not zero', function () {
            it('returns the price', async function () {
              await airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setAirnodeEndpointFlag(airnodeAddress, true);
              await airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setDefaultAirnodePrice(airnodeAddress, 100);

              expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
                100 * 10 ** decimals
              );
            });
          });
        });
        context('defaultChainAirnodePrice is not zero', function () {
          it('returns the price', async function () {
            await airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setAirnodeEndpointFlag(airnodeAddress, true);
            await airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setDefaultChainAirnodePrice(1, airnodeAddress, 100);

            expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
              100 * 10 ** decimals
            );
          });
        });
      });
      context('airnodeToEndpointToPrice is not zero', function () {
        it('returns the price', async function () {
          await airnodeFeeRegistry
            .connect(roles.airnodeFlagAndPriceSetter)
            .setAirnodeEndpointFlag(airnodeAddress, true);
          await airnodeFeeRegistry
            .connect(roles.airnodeFlagAndPriceSetter)
            .setAirnodeEndpointPrice(airnodeAddress, endpointId, 100);

          expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
            100 * 10 ** decimals
          );
        });
      });
    });
    context('airnodeEndpointFlag is not set', function () {
      context('defaultChainAirnodePrice is zero', function () {
        context('airnodeToEndpointToPrice is zero', function () {
          context('defaultAirnodePrice is zero', function () {
            context('defaultChainPrice is zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultPrice(100);
                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
                  100 * 10 ** decimals
                );
              });
            });
            context('defaultChainPrice is not zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry.connect(roles.globalDefaultPriceSetter).setDefaultChainPrice(1, 100);

                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
                  100 * 10 ** decimals
                );
              });
            });
          });
          context('defaultAirnodePrice is not zero', function () {
            it('returns the price', async function () {
              await airnodeFeeRegistry
                .connect(roles.airnodeFlagAndPriceSetter)
                .setDefaultAirnodePrice(airnodeAddress, 100);

              expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
                100 * 10 ** decimals
              );
            });
          });
        });
        context('airnodeToEndpointToPrice is not zero', function () {
          it('returns the price', async function () {
            await airnodeFeeRegistry
              .connect(roles.airnodeFlagAndPriceSetter)
              .setAirnodeEndpointPrice(airnodeAddress, endpointId, 100);

            expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
              100 * 10 ** decimals
            );
          });
        });
      });
      context('defaultChainAirnodePrice is not zero', function () {
        it('returns the price', async function () {
          await airnodeFeeRegistry
            .connect(roles.airnodeFlagAndPriceSetter)
            .setDefaultChainAirnodePrice(1, airnodeAddress, 100);

          expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(
            100 * 10 ** decimals
          );
        });
      });
    });
  });
  context('chainIdToAirnodeToEndpointToPrice is not zero', function () {
    it('returns the price', async function () {
      await airnodeFeeRegistry
        .connect(roles.airnodeFlagAndPriceSetter)
        .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 100);

      expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100 * 10 ** decimals);
    });
  });
});
