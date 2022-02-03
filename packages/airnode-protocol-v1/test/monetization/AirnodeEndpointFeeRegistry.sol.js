/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, airnodeEndpointPriceRegistry;
let airnodeEndpointPriceRegistryAdminRoleDescription = 'AirnodeEndpointPriceRegistry admin';

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    registrar: accounts[2],
    airnode: accounts[3],
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
    airnodeEndpointPriceRegistryAdminRoleDescription,
    roles.manager.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  const adminRole = await airnodeEndpointPriceRegistry.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, airnodeEndpointPriceRegistryAdminRoleDescription);
  const registrarRole = await airnodeEndpointPriceRegistry.registrarRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await airnodeEndpointPriceRegistry.REGISTRAR_ROLE_DESCRIPTION());
  await accessControlRegistry.connect(roles.manager).grantRole(registrarRole, roles.registrar.address);
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await airnodeEndpointPriceRegistry.DENOMINATION()).to.equal('USD');
    expect(await airnodeEndpointPriceRegistry.DECIMALS()).to.equal(18);
    expect(await airnodeEndpointPriceRegistry.PRICING_INTERVAL()).to.equal(30 * 24 * 60 * 60);
  });
});

describe('registerDefaultPrice', function () {
  context('Sender has the registrar role', function () {
    context('Price is not zero', function () {
      it('sets default price', async function () {
        const price = 123;
        let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(false);
        expect(priceFetchAttempt.price).to.equal(0);
        await expect(airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(price))
          .to.emit(airnodeEndpointPriceRegistry, 'RegisterDefaultPrice')
          .withArgs(price, roles.registrar.address);
        priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(true);
        expect(priceFetchAttempt.price).to.equal(price);
      });
    });
    context('Price is zero', function () {
      it('reverts', async function () {
        const price = 0;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(price)
        ).to.be.revertedWith('Cannot register zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Price is not zero', function () {
      it('sets default price', async function () {
        const price = 123;
        let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(false);
        expect(priceFetchAttempt.price).to.equal(0);
        await expect(airnodeEndpointPriceRegistry.connect(roles.manager).registerDefaultPrice(price))
          .to.emit(airnodeEndpointPriceRegistry, 'RegisterDefaultPrice')
          .withArgs(price, roles.manager.address);
        priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(true);
        expect(priceFetchAttempt.price).to.equal(price);
      });
    });
    context('Price is zero', function () {
      it('reverts', async function () {
        const price = 0;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.manager).registerDefaultPrice(price)
        ).to.be.revertedWith('Cannot register zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const price = 123;
      await expect(
        airnodeEndpointPriceRegistry.connect(roles.randomPerson).registerDefaultPrice(price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('registerDefaultChainPrice', function () {
  context('Sender has the registrar role', function () {
    context('Chain ID is not zero', function () {
      context('Price is not zero', function () {
        it('sets default chain price', async function () {
          const chainId = 3;
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, price))
            .to.emit(airnodeEndpointPriceRegistry, 'RegisterDefaultChainPrice')
            .withArgs(chainId, price, roles.registrar.address);
          priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const chainId = 3;
          const price = 0;
          await expect(
            airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const chainId = 0;
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, price)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Chain ID is not zero', function () {
      context('Price is not zero', function () {
        it('sets default chain price', async function () {
          const chainId = 3;
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointPriceRegistry.connect(roles.manager).registerDefaultChainPrice(chainId, price))
            .to.emit(airnodeEndpointPriceRegistry, 'RegisterDefaultChainPrice')
            .withArgs(chainId, price, roles.manager.address);
          priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const chainId = 3;
          const price = 0;
          await expect(
            airnodeEndpointPriceRegistry.connect(roles.manager).registerDefaultChainPrice(chainId, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const chainId = 0;
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.manager).registerDefaultChainPrice(chainId, price)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const chainId = 3;
      const price = 123;
      await expect(
        airnodeEndpointPriceRegistry.connect(roles.randomPerson).registerDefaultChainPrice(chainId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('registerAirnodePrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Price is not zero', function () {
        it('sets Airnode price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(
            airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, price)
          )
            .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodePrice')
            .withArgs(airnodeAddress, price, roles.registrar.address);
          priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 0;
          await expect(
            airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Airnode address is not zero', function () {
      context('Price is not zero', function () {
        it('sets Airnode price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointPriceRegistry.connect(roles.manager).registerAirnodePrice(airnodeAddress, price))
            .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodePrice')
            .withArgs(airnodeAddress, price, roles.manager.address);
          priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 0;
          await expect(
            airnodeEndpointPriceRegistry.connect(roles.manager).registerAirnodePrice(airnodeAddress, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.manager).registerAirnodePrice(airnodeAddress, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const price = 123;
      await expect(
        airnodeEndpointPriceRegistry.connect(roles.randomPerson).registerAirnodePrice(airnodeAddress, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('registerAirnodeChainPrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Chain ID is not zero', function () {
        context('Price is not zero', function () {
          it('sets Airnode, chain price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const price = 123;
            let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainPrice(
              airnodeAddress,
              chainId
            );
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.registrar)
                .registerAirnodeChainPrice(airnodeAddress, chainId, price)
            )
              .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodeChainPrice')
              .withArgs(airnodeAddress, chainId, price, roles.registrar.address);
            priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainPrice(airnodeAddress, chainId);
            expect(priceFetchAttempt.success).to.equal(true);
            expect(priceFetchAttempt.price).to.equal(price);
          });
        });
        context('Price is zero', function () {
          it('reverts', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const price = 0;
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.registrar)
                .registerAirnodeChainPrice(airnodeAddress, chainId, price)
            ).to.be.revertedWith('Cannot register zero');
          });
        });
      });
      context('Chain ID is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 0;
          const price = 123;
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .registerAirnodeChainPrice(airnodeAddress, chainId, price)
          ).to.be.revertedWith('Chain ID zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const chainId = 3;
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeChainPrice(airnodeAddress, chainId, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Airnode address is not zero', function () {
      context('Chain ID is not zero', function () {
        context('Price is not zero', function () {
          it('sets Airnode, chain price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const price = 123;
            let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainPrice(
              airnodeAddress,
              chainId
            );
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.manager)
                .registerAirnodeChainPrice(airnodeAddress, chainId, price)
            )
              .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodeChainPrice')
              .withArgs(airnodeAddress, chainId, price, roles.manager.address);
            priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainPrice(airnodeAddress, chainId);
            expect(priceFetchAttempt.success).to.equal(true);
            expect(priceFetchAttempt.price).to.equal(price);
          });
        });
        context('Price is zero', function () {
          it('reverts', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const price = 0;
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.manager)
                .registerAirnodeChainPrice(airnodeAddress, chainId, price)
            ).to.be.revertedWith('Cannot register zero');
          });
        });
      });
      context('Chain ID is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 0;
          const price = 123;
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.manager)
              .registerAirnodeChainPrice(airnodeAddress, chainId, price)
          ).to.be.revertedWith('Chain ID zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const chainId = 3;
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.manager).registerAirnodeChainPrice(airnodeAddress, chainId, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const chainId = 3;
      const price = 123;
      await expect(
        airnodeEndpointPriceRegistry
          .connect(roles.randomPerson)
          .registerAirnodeChainPrice(airnodeAddress, chainId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('registerAirnodeEndpointPrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Price is not zero', function () {
        it('sets Airnode, endpoint price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const endpointId = testUtils.generateRandomBytes32();
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeEndpointPrice(
            airnodeAddress,
            endpointId
          );
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
          )
            .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodeEndpointPrice')
            .withArgs(airnodeAddress, endpointId, price, roles.registrar.address);
          priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeEndpointPrice(
            airnodeAddress,
            endpointId
          );
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const endpointId = testUtils.generateRandomBytes32();
          const price = 0;
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const endpointId = testUtils.generateRandomBytes32();
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Airnode address is not zero', function () {
      context('Price is not zero', function () {
        it('sets Airnode, endpoint price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const endpointId = testUtils.generateRandomBytes32();
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeEndpointPrice(
            airnodeAddress,
            endpointId
          );
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.manager)
              .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
          )
            .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodeEndpointPrice')
            .withArgs(airnodeAddress, endpointId, price, roles.manager.address);
          priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeEndpointPrice(
            airnodeAddress,
            endpointId
          );
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const endpointId = testUtils.generateRandomBytes32();
          const price = 0;
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.manager)
              .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const endpointId = testUtils.generateRandomBytes32();
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const endpointId = testUtils.generateRandomBytes32();
      const price = 123;
      await expect(
        airnodeEndpointPriceRegistry
          .connect(roles.randomPerson)
          .registerAirnodeEndpointPrice(airnodeAddress, endpointId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('registerAirnodeChainEndpointPrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Chain ID is not zero', function () {
        context('Price is not zero', function () {
          it('sets Airnode, chain, endpoint price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            const price = 123;
            let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainEndpointPrice(
              airnodeAddress,
              chainId,
              endpointId
            );
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.registrar)
                .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
            )
              .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodeChainEndpointPrice')
              .withArgs(airnodeAddress, chainId, endpointId, price, roles.registrar.address);
            priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainEndpointPrice(
              airnodeAddress,
              chainId,
              endpointId
            );
            expect(priceFetchAttempt.success).to.equal(true);
            expect(priceFetchAttempt.price).to.equal(price);
          });
        });
        context('Price is zero', function () {
          it('reverts', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            const price = 0;
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.registrar)
                .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
            ).to.be.revertedWith('Cannot register zero');
          });
        });
      });
      context('Chain ID is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 0;
          const endpointId = testUtils.generateRandomBytes32();
          const price = 123;
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
          ).to.be.revertedWith('Chain ID zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const chainId = 3;
        const endpointId = testUtils.generateRandomBytes32();
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Airnode address is not zero', function () {
      context('Chain ID is not zero', function () {
        context('Price is not zero', function () {
          it('sets Airnode, chain, endpoint price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            const price = 123;
            let priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainEndpointPrice(
              airnodeAddress,
              chainId,
              endpointId
            );
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.manager)
                .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
            )
              .to.emit(airnodeEndpointPriceRegistry, 'RegisterAirnodeChainEndpointPrice')
              .withArgs(airnodeAddress, chainId, endpointId, price, roles.manager.address);
            priceFetchAttempt = await airnodeEndpointPriceRegistry.tryReadAirnodeChainEndpointPrice(
              airnodeAddress,
              chainId,
              endpointId
            );
            expect(priceFetchAttempt.success).to.equal(true);
            expect(priceFetchAttempt.price).to.equal(price);
          });
        });
        context('Price is zero', function () {
          it('reverts', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            const price = 0;
            await expect(
              airnodeEndpointPriceRegistry
                .connect(roles.manager)
                .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
            ).to.be.revertedWith('Cannot register zero');
          });
        });
      });
      context('Chain ID is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 0;
          const endpointId = testUtils.generateRandomBytes32();
          const price = 123;
          await expect(
            airnodeEndpointPriceRegistry
              .connect(roles.manager)
              .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
          ).to.be.revertedWith('Chain ID zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const chainId = 3;
        const endpointId = testUtils.generateRandomBytes32();
        const price = 123;
        await expect(
          airnodeEndpointPriceRegistry
            .connect(roles.manager)
            .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const chainId = 3;
      const endpointId = testUtils.generateRandomBytes32();
      const price = 123;
      await expect(
        airnodeEndpointPriceRegistry
          .connect(roles.randomPerson)
          .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('setEndpointAndChainPricePriority', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      it('sets Airnode price', async function () {
        const airnodeAddress = testUtils.generateRandomAddress();
        const status = true;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.registrar).setEndpointAndChainPricePriority(airnodeAddress, status)
        )
          .to.emit(airnodeEndpointPriceRegistry, 'SetEndpointAndChainPricePriority')
          .withArgs(airnodeAddress, status, roles.registrar.address);
        expect(await airnodeEndpointPriceRegistry.prioritizeEndpointPriceOverChainPrice(airnodeAddress)).to.equal(true);
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const status = true;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.registrar).setEndpointAndChainPricePriority(airnodeAddress, status)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender is the manager', function () {
    context('Airnode address is not zero', function () {
      it('sets Airnode price', async function () {
        const airnodeAddress = testUtils.generateRandomAddress();
        const status = true;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.manager).setEndpointAndChainPricePriority(airnodeAddress, status)
        )
          .to.emit(airnodeEndpointPriceRegistry, 'SetEndpointAndChainPricePriority')
          .withArgs(airnodeAddress, status, roles.manager.address);
        expect(await airnodeEndpointPriceRegistry.prioritizeEndpointPriceOverChainPrice(airnodeAddress)).to.equal(true);
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const status = true;
        await expect(
          airnodeEndpointPriceRegistry.connect(roles.manager).setEndpointAndChainPricePriority(airnodeAddress, status)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const status = true;
      await expect(
        airnodeEndpointPriceRegistry
          .connect(roles.randomPerson)
          .setEndpointAndChainPricePriority(airnodeAddress, status)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('getPrice', function () {
  context('Airnode, chain, endpoint price is set', function () {
    it('returns Airnode, chain, endpoint price', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const chainId = 3;
      const endpointId = testUtils.generateRandomBytes32();
      await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
      await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
      await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
      await airnodeEndpointPriceRegistry
        .connect(roles.registrar)
        .registerAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
      await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodeChainPrice(airnodeAddress, chainId, 5);
      await airnodeEndpointPriceRegistry
        .connect(roles.registrar)
        .registerAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, 6);
      expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(6);
    });
  });
  context('Airnode, chain, endpoint price is not set', function () {
    context('Airnode, chain price is prioritized', function () {
      context('Airnode, chain price is set', function () {
        it('returns Airnode, chain price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 3;
          const endpointId = testUtils.generateRandomBytes32();
          await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
          await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
          await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
          await airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
          await airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeChainPrice(airnodeAddress, chainId, 5);
          expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(5);
        });
      });
      context('Airnode, chain price is not set', function () {
        context('Airnode, endpoint price is set', function () {
          it('returns Airnode, endpoint price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
            await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
            await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
            await airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .registerAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
            expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(4);
          });
        });
        context('Airnode, endpoint price is not set', function () {
          context('Airnode price is set', function () {
            it('returns Airnode price', async function () {
              const airnodeAddress = testUtils.generateRandomAddress();
              const chainId = 3;
              const endpointId = testUtils.generateRandomBytes32();
              await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
              await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
              await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
              expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(3);
            });
          });
          context('Airnode price is not set', function () {
            context('Default chain price is set', function () {
              it('returns default chain price', async function () {
                const airnodeAddress = testUtils.generateRandomAddress();
                const chainId = 3;
                const endpointId = testUtils.generateRandomBytes32();
                await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
                await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
                expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(2);
              });
            });
            context('Default chain price is not set', function () {
              context('Default price is set', function () {
                it('returns default price', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
                  expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(1);
                });
              });
              context('Default price is not set', function () {
                it('reverts', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await expect(
                    airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)
                  ).to.be.revertedWith('No default price set');
                });
              });
            });
          });
        });
      });
    });
    context('Airnode, endpoint price is prioritized', function () {
      context('Airnode, endpoint price is set', function () {
        it('returns Airnode, endpoint price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 3;
          const endpointId = testUtils.generateRandomBytes32();
          await airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .setEndpointAndChainPricePriority(airnodeAddress, true);
          await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
          await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
          await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
          await airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
          await airnodeEndpointPriceRegistry
            .connect(roles.registrar)
            .registerAirnodeChainPrice(airnodeAddress, chainId, 5);
          expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(4);
        });
      });
      context('Airnode, endpoint price is not set', function () {
        context('Airnode, chain price is set', function () {
          it('returns Airnode, chain price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            await airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .setEndpointAndChainPricePriority(airnodeAddress, true);
            await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
            await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
            await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
            await airnodeEndpointPriceRegistry
              .connect(roles.registrar)
              .registerAirnodeChainPrice(airnodeAddress, chainId, 5);
            expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(5);
          });
        });
        context('Airnode, chain price is not set', function () {
          context('Airnode price is set', function () {
            it('returns Airnode price', async function () {
              const airnodeAddress = testUtils.generateRandomAddress();
              const chainId = 3;
              const endpointId = testUtils.generateRandomBytes32();
              await airnodeEndpointPriceRegistry
                .connect(roles.registrar)
                .setEndpointAndChainPricePriority(airnodeAddress, true);
              await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
              await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
              await airnodeEndpointPriceRegistry.connect(roles.registrar).registerAirnodePrice(airnodeAddress, 3);
              expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(3);
            });
          });
          context('Airnode price is not set', function () {
            context('Default chain price is set', function () {
              it('returns default chain price', async function () {
                const airnodeAddress = testUtils.generateRandomAddress();
                const chainId = 3;
                const endpointId = testUtils.generateRandomBytes32();
                await airnodeEndpointPriceRegistry
                  .connect(roles.registrar)
                  .setEndpointAndChainPricePriority(airnodeAddress, true);
                await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
                await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultChainPrice(chainId, 2);
                expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(2);
              });
            });
            context('Default chain price is not set', function () {
              context('Default price is set', function () {
                it('returns default price', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await airnodeEndpointPriceRegistry
                    .connect(roles.registrar)
                    .setEndpointAndChainPricePriority(airnodeAddress, true);
                  await airnodeEndpointPriceRegistry.connect(roles.registrar).registerDefaultPrice(1);
                  expect(await airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(1);
                });
              });
              context('Default price is not set', function () {
                it('reverts', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await airnodeEndpointPriceRegistry
                    .connect(roles.registrar)
                    .setEndpointAndChainPricePriority(airnodeAddress, true);
                  await expect(
                    airnodeEndpointPriceRegistry.getPrice(airnodeAddress, chainId, endpointId)
                  ).to.be.revertedWith('No default price set');
                });
              });
            });
          });
        });
      });
    });
  });
});
