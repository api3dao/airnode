/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../utils');

let roles;
let accessControlRegistry, airnodeFeeRegistry;
let airnodeFeeRegistryAdminRoleDescription = 'AirnodeFeeRegistry admin';
let adminRole, defaultPriceSetterRole, airnodePriceSetterRole;
let airnodeAddress = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    defaultPriceSetter: accounts[2],
    airnodePriceSetter: accounts[3],
    anotherAirnodePriceSetterRole: accounts[5],
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
  defaultPriceSetterRole = await airnodeFeeRegistry.defaultPriceSetterRole();
  airnodePriceSetterRole = await airnodeFeeRegistry.airnodePriceSetterRole();
  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole, adminRole],
    [
      airnodeFeeRegistryAdminRoleDescription,
      await airnodeFeeRegistry.DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION(),
      await airnodeFeeRegistry.AIRNODE_PRICE_SETTER_DESCRIPTION(),
      await airnodeFeeRegistry.AIRNODE_PRICE_SETTER_DESCRIPTION(),
    ],
    [
      roles.manager.address, // which will already have been granted the role
      roles.defaultPriceSetter.address,
      roles.airnodePriceSetter.address,
      roles.anotherAirnodePriceSetterRole.address,
    ]
  );
  // Grant `roles.randomPerson` some invalid roles
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [managerRootRole, managerRootRole, managerRootRole],
      [
        Math.random(),
        await airnodeFeeRegistry.DEFAULT_PRICE_SETTER_ROLE_DESCRIPTION(),
        await airnodeFeeRegistry.AIRNODE_PRICE_SETTER_DESCRIPTION(),
      ],
      [roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address]
    );
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

describe('setEndpointPriceOverChainPricePriority', function () {
  context('Sender has airnode flag and price setter role or is manager', function () {
    context('AirnodeEndpoint Flag status is being set', function () {
      context('airnode address is valid', function () {
        it('sets the status', async function () {
          let prioritizeEndpointPriceOverChainPrice;
          prioritizeEndpointPriceOverChainPrice = await airnodeFeeRegistry.prioritizeEndpointPriceOverChainPrice(
            airnodeAddress
          );
          expect(prioritizeEndpointPriceOverChainPrice).to.equal(false);
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
              .setEndpointPriceOverChainPricePriority(airnodeAddress, true)
          )
            .to.emit(airnodeFeeRegistry, 'SetEndpointPriceOverChainPricePriority')
            .withArgs(airnodeAddress, true, roles.airnodePriceSetter.address);
          prioritizeEndpointPriceOverChainPrice = await airnodeFeeRegistry.prioritizeEndpointPriceOverChainPrice(
            airnodeAddress
          );
          expect(prioritizeEndpointPriceOverChainPrice).to.equal(true);

          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(airnodePriceSetterRole, roles.manager.address);

          prioritizeEndpointPriceOverChainPrice = await airnodeFeeRegistry.prioritizeEndpointPriceOverChainPrice(
            airnodeAddress
          );
          expect(prioritizeEndpointPriceOverChainPrice).to.equal(true);
          await expect(
            airnodeFeeRegistry.connect(roles.manager).setEndpointPriceOverChainPricePriority(airnodeAddress, false)
          )
            .to.emit(airnodeFeeRegistry, 'SetEndpointPriceOverChainPricePriority')
            .withArgs(airnodeAddress, false, roles.manager.address);
          prioritizeEndpointPriceOverChainPrice = await airnodeFeeRegistry.prioritizeEndpointPriceOverChainPrice(
            airnodeAddress
          );
          expect(prioritizeEndpointPriceOverChainPrice).to.equal(false);
        });
      });
      context('airnode address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
              .setEndpointPriceOverChainPricePriority(hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('Address is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setEndpointPriceOverChainPricePriority(airnodeAddress, true)
      ).to.be.revertedWith('Not airnode price setter');
    });
  });
});

describe('setDefaultPrice', function () {
  context('Sender has global default price setter role or is manager', function () {
    context('default price is being set', function () {
      context('price is valid', function () {
        it('sets the default price', async function () {
          let defaultPrice;
          defaultPrice = await airnodeFeeRegistry.defaultPrice();
          expect(defaultPrice).to.equal(0);
          await expect(airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultPrice(100))
            .to.emit(airnodeFeeRegistry, 'SetDefaultPrice')
            .withArgs(100, roles.defaultPriceSetter.address);
          defaultPrice = await airnodeFeeRegistry.defaultPrice();
          expect(defaultPrice).to.equal(100);

          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(defaultPriceSetterRole, roles.manager.address);

          await expect(airnodeFeeRegistry.connect(roles.manager).setDefaultPrice(1000))
            .to.emit(airnodeFeeRegistry, 'SetDefaultPrice')
            .withArgs(1000, roles.manager.address);
          defaultPrice = await airnodeFeeRegistry.defaultPrice();
          expect(defaultPrice).to.equal(1000);
        });
      });
      context('price is not valid', function () {
        it('reverts', async function () {
          await expect(airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultPrice(0)).to.be.revertedWith(
            'Price is zero'
          );
        });
      });
    });
  });
  context('Sender does not have the global default price setter role', function () {
    it('reverts', async function () {
      await expect(airnodeFeeRegistry.connect(roles.randomPerson).setDefaultPrice(100)).to.be.revertedWith(
        'Not default price setter'
      );
    });
  });
});

describe('setDefaultChainPrice', function () {
  context('Sender has global default price setter role or is manager', function () {
    context('default price on chain is being set', function () {
      context('chainId is valid', function () {
        context('price is valid', function () {
          it('sets the default price on the chain', async function () {
            let defaultChainPrice;
            defaultChainPrice = await airnodeFeeRegistry.defaultChainPrice(1);
            expect(defaultChainPrice).to.equal(0);
            await expect(airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultChainPrice(1, 100))
              .to.emit(airnodeFeeRegistry, 'SetDefaultChainPrice')
              .withArgs(1, 100, roles.defaultPriceSetter.address);
            defaultChainPrice = await airnodeFeeRegistry.defaultChainPrice(1);
            expect(defaultChainPrice).to.equal(100);

            await accessControlRegistry
              .connect(roles.manager)
              .renounceRole(defaultPriceSetterRole, roles.manager.address);

            await expect(airnodeFeeRegistry.connect(roles.manager).setDefaultChainPrice(1, 1000))
              .to.emit(airnodeFeeRegistry, 'SetDefaultChainPrice')
              .withArgs(1, 1000, roles.manager.address);
            defaultChainPrice = await airnodeFeeRegistry.defaultChainPrice(1);
            expect(defaultChainPrice).to.equal(1000);
          });
        });
        context('price is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultChainPrice(1, 0)
            ).to.be.revertedWith('Price is zero');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultChainPrice(0, 100)
          ).to.be.revertedWith('ChainId is zero');
        });
      });
    });
  });
  context('Sender does not have the global default price setter role', function () {
    it('reverts', async function () {
      await expect(airnodeFeeRegistry.connect(roles.randomPerson).setDefaultChainPrice(1, 100)).to.be.revertedWith(
        'Not default price setter'
      );
    });
  });
});

describe('setAirnodePrice', function () {
  context('Sender has airnode flag and price setter role or is manager', function () {
    context('default price on airnode is being set', function () {
      context('airnode is valid', function () {
        context('price is valid', function () {
          it('sets the default price on the airnode', async function () {
            let airnodeToPrice;
            airnodeToPrice = await airnodeFeeRegistry.airnodeToPrice(airnodeAddress);
            expect(airnodeToPrice).to.equal(0);
            await expect(airnodeFeeRegistry.connect(roles.airnodePriceSetter).setAirnodePrice(airnodeAddress, 100))
              .to.emit(airnodeFeeRegistry, 'SetAirnodePrice')
              .withArgs(airnodeAddress, 100, roles.airnodePriceSetter.address);
            airnodeToPrice = await airnodeFeeRegistry.airnodeToPrice(airnodeAddress);
            expect(airnodeToPrice).to.equal(100);

            await accessControlRegistry
              .connect(roles.manager)
              .renounceRole(airnodePriceSetterRole, roles.manager.address);

            await expect(airnodeFeeRegistry.connect(roles.manager).setAirnodePrice(airnodeAddress, 1000))
              .to.emit(airnodeFeeRegistry, 'SetAirnodePrice')
              .withArgs(airnodeAddress, 1000, roles.manager.address);
            airnodeToPrice = await airnodeFeeRegistry.airnodeToPrice(airnodeAddress);
            expect(airnodeToPrice).to.equal(1000);
          });
        });
        context('price is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry.connect(roles.airnodePriceSetter).setAirnodePrice(airnodeAddress, 0)
            ).to.be.revertedWith('Price is zero');
          });
        });
      });
      context('airnode is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry.connect(roles.airnodePriceSetter).setAirnodePrice(hre.ethers.constants.AddressZero, 100)
          ).to.be.revertedWith('Address is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setAirnodePrice(airnodeAddress, 100)
      ).to.be.revertedWith('Not airnode price setter');
    });
  });
});

describe('setChainAirnodePrice', function () {
  context('Sender has airnode flag and price setter role or is manager', function () {
    context('default price on airnode and chain is being set', function () {
      context('chainId is valid', function () {
        context('airnode is valid', function () {
          context('price is valid', function () {
            it('sets the default price on the airnode', async function () {
              let chainIdToAirnodeToPrice;
              chainIdToAirnodeToPrice = await airnodeFeeRegistry.chainIdToAirnodeToPrice(1, airnodeAddress);
              expect(chainIdToAirnodeToPrice).to.equal(0);
              await expect(
                airnodeFeeRegistry.connect(roles.airnodePriceSetter).setChainAirnodePrice(1, airnodeAddress, 100)
              )
                .to.emit(airnodeFeeRegistry, 'SetChainAirnodePrice')
                .withArgs(1, airnodeAddress, 100, roles.airnodePriceSetter.address);
              chainIdToAirnodeToPrice = await airnodeFeeRegistry.chainIdToAirnodeToPrice(1, airnodeAddress);
              expect(chainIdToAirnodeToPrice).to.equal(100);

              await accessControlRegistry
                .connect(roles.manager)
                .renounceRole(airnodePriceSetterRole, roles.manager.address);

              await expect(airnodeFeeRegistry.connect(roles.manager).setChainAirnodePrice(1, airnodeAddress, 1000))
                .to.emit(airnodeFeeRegistry, 'SetChainAirnodePrice')
                .withArgs(1, airnodeAddress, 1000, roles.manager.address);
              chainIdToAirnodeToPrice = await airnodeFeeRegistry.chainIdToAirnodeToPrice(1, airnodeAddress);
              expect(chainIdToAirnodeToPrice).to.equal(1000);
            });
          });
          context('price is not valid', function () {
            it('reverts', async function () {
              await expect(
                airnodeFeeRegistry.connect(roles.airnodePriceSetter).setChainAirnodePrice(1, airnodeAddress, 0)
              ).to.be.revertedWith('Price is zero');
            });
          });
        });
        context('airnode is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodePriceSetter)
                .setChainAirnodePrice(1, hre.ethers.constants.AddressZero, 100)
            ).to.be.revertedWith('Address is zero');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
              .setChainAirnodePrice(0, hre.ethers.constants.AddressZero, 100)
          ).to.be.revertedWith('ChainId is zero');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeFeeRegistry.connect(roles.randomPerson).setChainAirnodePrice(1, airnodeAddress, 100)
      ).to.be.revertedWith('Not airnode price setter');
    });
  });
});

describe('setAirnodeEndpointPrice', function () {
  context('Sender has airnode flag and price setter role or is manager', function () {
    context('default price on airnode and endpoint is being set', function () {
      context('airnode is valid', function () {
        context('price is valid', function () {
          it('sets the default price of airnode endpoint', async function () {
            let airnodeToEndpointToPrice;
            airnodeToEndpointToPrice = await airnodeFeeRegistry.airnodeToEndpointToPrice(airnodeAddress, endpointId);
            expect(airnodeToEndpointToPrice).to.equal(0);
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodePriceSetter)
                .setAirnodeEndpointPrice(airnodeAddress, endpointId, 100)
            )
              .to.emit(airnodeFeeRegistry, 'SetAirnodeEndpointPrice')
              .withArgs(airnodeAddress, endpointId, 100, roles.airnodePriceSetter.address);
            airnodeToEndpointToPrice = await airnodeFeeRegistry.airnodeToEndpointToPrice(airnodeAddress, endpointId);
            expect(airnodeToEndpointToPrice).to.equal(100);

            await accessControlRegistry
              .connect(roles.manager)
              .renounceRole(airnodePriceSetterRole, roles.manager.address);

            await expect(
              airnodeFeeRegistry.connect(roles.manager).setAirnodeEndpointPrice(airnodeAddress, endpointId, 1000)
            )
              .to.emit(airnodeFeeRegistry, 'SetAirnodeEndpointPrice')
              .withArgs(airnodeAddress, endpointId, 1000, roles.manager.address);
            airnodeToEndpointToPrice = await airnodeFeeRegistry.airnodeToEndpointToPrice(airnodeAddress, endpointId);
            expect(airnodeToEndpointToPrice).to.equal(1000);
          });
        });
        context('price is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodePriceSetter)
                .setAirnodeEndpointPrice(airnodeAddress, endpointId, 0)
            ).to.be.revertedWith('Price is zero');
          });
        });
      });
      context('airnode is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
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
      ).to.be.revertedWith('Not airnode price setter');
    });
  });
});

describe('setChainAirnodeEndpointPrice', function () {
  context('Sender has airnode flag and price setter role or is manager', function () {
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
                  .connect(roles.airnodePriceSetter)
                  .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 100)
              )
                .to.emit(airnodeFeeRegistry, 'SetChainAirnodeEndpointPrice')
                .withArgs(1, airnodeAddress, endpointId, 100, roles.airnodePriceSetter.address);
              chainIdToAirnodeToEndpointToPrice = await airnodeFeeRegistry.chainIdToAirnodeToEndpointToPrice(
                1,
                airnodeAddress,
                endpointId
              );
              expect(chainIdToAirnodeToEndpointToPrice).to.equal(100);

              await accessControlRegistry
                .connect(roles.manager)
                .renounceRole(airnodePriceSetterRole, roles.manager.address);

              await expect(
                airnodeFeeRegistry
                  .connect(roles.manager)
                  .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 1000)
              )
                .to.emit(airnodeFeeRegistry, 'SetChainAirnodeEndpointPrice')
                .withArgs(1, airnodeAddress, endpointId, 1000, roles.manager.address);
              chainIdToAirnodeToEndpointToPrice = await airnodeFeeRegistry.chainIdToAirnodeToEndpointToPrice(
                1,
                airnodeAddress,
                endpointId
              );
              expect(chainIdToAirnodeToEndpointToPrice).to.equal(1000);
            });
          });
          context('price is not valid', function () {
            it('reverts', async function () {
              await expect(
                airnodeFeeRegistry
                  .connect(roles.airnodePriceSetter)
                  .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 0)
              ).to.be.revertedWith('Price is zero');
            });
          });
        });
        context('airnode is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeFeeRegistry
                .connect(roles.airnodePriceSetter)
                .setChainAirnodeEndpointPrice(1, hre.ethers.constants.AddressZero, endpointId, 100)
            ).to.be.revertedWith('Address is zero');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
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
      ).to.be.revertedWith('Not airnode price setter');
    });
  });
});

describe('getEndpointPrice', function () {
  context('chainIdToAirnodeToEndpointToPrice is zero', function () {
    context('prioritizeEndpointPriceOverChainPrice is set', function () {
      context('airnodeToEndpointToPrice is zero', function () {
        context('chainIdToAirnodeToPrice is zero', function () {
          context('airnodeToPrice is zero', function () {
            context('defaultChainPrice is zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry
                  .connect(roles.airnodePriceSetter)
                  .setEndpointPriceOverChainPricePriority(airnodeAddress, true);
                await airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultPrice(100);
                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
              });
            });
            context('defaultChainPrice is not zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry
                  .connect(roles.airnodePriceSetter)
                  .setEndpointPriceOverChainPricePriority(airnodeAddress, true);
                await airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultChainPrice(1, 100);

                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
              });
            });
          });
          context('airnodeToPrice is not zero', function () {
            it('returns the price', async function () {
              await airnodeFeeRegistry
                .connect(roles.airnodePriceSetter)
                .setEndpointPriceOverChainPricePriority(airnodeAddress, true);
              await airnodeFeeRegistry.connect(roles.airnodePriceSetter).setAirnodePrice(airnodeAddress, 100);

              expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
            });
          });
        });
        context('chainIdToAirnodeToPrice is not zero', function () {
          it('returns the price', async function () {
            await airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
              .setEndpointPriceOverChainPricePriority(airnodeAddress, true);
            await airnodeFeeRegistry.connect(roles.airnodePriceSetter).setChainAirnodePrice(1, airnodeAddress, 100);

            expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
          });
        });
      });
      context('airnodeToEndpointToPrice is not zero', function () {
        it('returns the price', async function () {
          await airnodeFeeRegistry
            .connect(roles.airnodePriceSetter)
            .setEndpointPriceOverChainPricePriority(airnodeAddress, true);
          await airnodeFeeRegistry
            .connect(roles.airnodePriceSetter)
            .setAirnodeEndpointPrice(airnodeAddress, endpointId, 100);

          expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
        });
      });
    });
    context('prioritizeEndpointPriceOverChainPrice is not set', function () {
      context('chainIdToAirnodeToPrice is zero', function () {
        context('airnodeToEndpointToPrice is zero', function () {
          context('airnodeToPrice is zero', function () {
            context('defaultChainPrice is zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultPrice(100);
                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
              });
            });
            context('defaultChainPrice is not zero', function () {
              it('returns the price', async function () {
                await airnodeFeeRegistry.connect(roles.defaultPriceSetter).setDefaultChainPrice(1, 100);

                expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
              });
            });
          });
          context('airnodeToPrice is not zero', function () {
            it('returns the price', async function () {
              await airnodeFeeRegistry.connect(roles.airnodePriceSetter).setAirnodePrice(airnodeAddress, 100);

              expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
            });
          });
        });
        context('airnodeToEndpointToPrice is not zero', function () {
          it('returns the price', async function () {
            await airnodeFeeRegistry
              .connect(roles.airnodePriceSetter)
              .setAirnodeEndpointPrice(airnodeAddress, endpointId, 100);

            expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
          });
        });
      });
      context('chainIdToAirnodeToPrice is not zero', function () {
        it('returns the price', async function () {
          await airnodeFeeRegistry.connect(roles.airnodePriceSetter).setChainAirnodePrice(1, airnodeAddress, 100);

          expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
        });
      });
    });
  });
  context('chainIdToAirnodeToEndpointToPrice is not zero', function () {
    it('returns the price', async function () {
      await airnodeFeeRegistry
        .connect(roles.airnodePriceSetter)
        .setChainAirnodeEndpointPrice(1, airnodeAddress, endpointId, 100);

      expect(await airnodeFeeRegistry.getEndpointPrice(1, airnodeAddress, endpointId)).to.equal(100);
    });
  });
});
