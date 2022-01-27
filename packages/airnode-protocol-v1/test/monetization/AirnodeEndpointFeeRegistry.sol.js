/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, airnodeEndpointFeeRegistry;
let airnodeEndpointFeeRegistryAdminRoleDescription = 'AirnodeEndpointFeeRegistry admin';

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
  const airnodeEndpointFeeRegistryFactory = await hre.ethers.getContractFactory(
    'AirnodeEndpointFeeRegistry',
    roles.deployer
  );
  airnodeEndpointFeeRegistry = await airnodeEndpointFeeRegistryFactory.deploy(
    accessControlRegistry.address,
    airnodeEndpointFeeRegistryAdminRoleDescription,
    roles.manager.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  const adminRole = await airnodeEndpointFeeRegistry.adminRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, airnodeEndpointFeeRegistryAdminRoleDescription);
  const registrarRole = await airnodeEndpointFeeRegistry.registrarRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(adminRole, await airnodeEndpointFeeRegistry.REGISTRAR_ROLE_DESCRIPTION());
  await accessControlRegistry.connect(roles.manager).grantRole(registrarRole, roles.registrar.address);
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await airnodeEndpointFeeRegistry.DENOMINATION()).to.equal('USD');
    expect(await airnodeEndpointFeeRegistry.DECIMALS()).to.equal(18);
    expect(await airnodeEndpointFeeRegistry.PRICING_INTERVAL()).to.equal(30 * 24 * 60 * 60);
  });
});

describe('setDefaultPrice', function () {
  context('Sender has the registrar role', function () {
    context('Price is not zero', function () {
      it('sets default price', async function () {
        const price = 123;
        let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(false);
        expect(priceFetchAttempt.price).to.equal(0);
        await expect(airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(price))
          .to.emit(airnodeEndpointFeeRegistry, 'SetDefaultPrice')
          .withArgs(price, roles.registrar.address);
        priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(true);
        expect(priceFetchAttempt.price).to.equal(price);
      });
    });
    context('Price is zero', function () {
      it('reverts', async function () {
        const price = 0;
        await expect(airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(price)).to.be.revertedWith(
          'Cannot register zero'
        );
      });
    });
  });
  context('Sender is the manager', function () {
    context('Price is not zero', function () {
      it('sets default price', async function () {
        const price = 123;
        let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(false);
        expect(priceFetchAttempt.price).to.equal(0);
        await expect(airnodeEndpointFeeRegistry.connect(roles.manager).setDefaultPrice(price))
          .to.emit(airnodeEndpointFeeRegistry, 'SetDefaultPrice')
          .withArgs(price, roles.manager.address);
        priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultPrice();
        expect(priceFetchAttempt.success).to.equal(true);
        expect(priceFetchAttempt.price).to.equal(price);
      });
    });
    context('Price is zero', function () {
      it('reverts', async function () {
        const price = 0;
        await expect(airnodeEndpointFeeRegistry.connect(roles.manager).setDefaultPrice(price)).to.be.revertedWith(
          'Cannot register zero'
        );
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const price = 123;
      await expect(airnodeEndpointFeeRegistry.connect(roles.randomPerson).setDefaultPrice(price)).to.be.revertedWith(
        'Sender cannot register'
      );
    });
  });
});

describe('setDefaultChainPrice', function () {
  context('Sender has the registrar role', function () {
    context('Chain ID is not zero', function () {
      context('Price is not zero', function () {
        it('sets default chain price', async function () {
          const chainId = 3;
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, price))
            .to.emit(airnodeEndpointFeeRegistry, 'SetDefaultChainPrice')
            .withArgs(chainId, price, roles.registrar.address);
          priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const chainId = 3;
          const price = 0;
          await expect(
            airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const chainId = 0;
        const price = 123;
        await expect(
          airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, price)
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
          let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointFeeRegistry.connect(roles.manager).setDefaultChainPrice(chainId, price))
            .to.emit(airnodeEndpointFeeRegistry, 'SetDefaultChainPrice')
            .withArgs(chainId, price, roles.manager.address);
          priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadDefaultChainPrice(chainId);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const chainId = 3;
          const price = 0;
          await expect(
            airnodeEndpointFeeRegistry.connect(roles.manager).setDefaultChainPrice(chainId, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Chain ID is zero', function () {
      it('reverts', async function () {
        const chainId = 0;
        const price = 123;
        await expect(
          airnodeEndpointFeeRegistry.connect(roles.manager).setDefaultChainPrice(chainId, price)
        ).to.be.revertedWith('Chain ID zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const chainId = 3;
      const price = 123;
      await expect(
        airnodeEndpointFeeRegistry.connect(roles.randomPerson).setDefaultChainPrice(chainId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('setAirnodePrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Price is not zero', function () {
        it('sets Airnode price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, price))
            .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodePrice')
            .withArgs(airnodeAddress, price, roles.registrar.address);
          priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 0;
          await expect(
            airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const price = 123;
        await expect(
          airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, price)
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
          let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodePrice(airnodeAddress, price))
            .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodePrice')
            .withArgs(airnodeAddress, price, roles.manager.address);
          priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodePrice(airnodeAddress);
          expect(priceFetchAttempt.success).to.equal(true);
          expect(priceFetchAttempt.price).to.equal(price);
        });
      });
      context('Price is zero', function () {
        it('reverts', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const price = 0;
          await expect(
            airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodePrice(airnodeAddress, price)
          ).to.be.revertedWith('Cannot register zero');
        });
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const price = 123;
        await expect(
          airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodePrice(airnodeAddress, price)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const price = 123;
      await expect(
        airnodeEndpointFeeRegistry.connect(roles.randomPerson).setAirnodePrice(airnodeAddress, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('setAirnodeChainPrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Chain ID is not zero', function () {
        context('Price is not zero', function () {
          it('sets Airnode, chain price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const price = 123;
            let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainPrice(airnodeAddress, chainId);
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, price)
            )
              .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodeChainPrice')
              .withArgs(airnodeAddress, chainId, price, roles.registrar.address);
            priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainPrice(airnodeAddress, chainId);
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
              airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, price)
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
            airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, price)
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
          airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, price)
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
            let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainPrice(airnodeAddress, chainId);
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeChainPrice(airnodeAddress, chainId, price)
            )
              .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodeChainPrice')
              .withArgs(airnodeAddress, chainId, price, roles.manager.address);
            priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainPrice(airnodeAddress, chainId);
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
              airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeChainPrice(airnodeAddress, chainId, price)
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
            airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeChainPrice(airnodeAddress, chainId, price)
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
          airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeChainPrice(airnodeAddress, chainId, price)
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
        airnodeEndpointFeeRegistry.connect(roles.randomPerson).setAirnodeChainPrice(airnodeAddress, chainId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('setAirnodeEndpointPrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Price is not zero', function () {
        it('sets Airnode, endpoint price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const endpointId = testUtils.generateRandomBytes32();
          const price = 123;
          let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeEndpointPrice(
            airnodeAddress,
            endpointId
          );
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(
            airnodeEndpointFeeRegistry
              .connect(roles.registrar)
              .setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
          )
            .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodeEndpointPrice')
            .withArgs(airnodeAddress, endpointId, price, roles.registrar.address);
          priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeEndpointPrice(airnodeAddress, endpointId);
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
            airnodeEndpointFeeRegistry
              .connect(roles.registrar)
              .setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
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
          airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
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
          let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeEndpointPrice(
            airnodeAddress,
            endpointId
          );
          expect(priceFetchAttempt.success).to.equal(false);
          expect(priceFetchAttempt.price).to.equal(0);
          await expect(
            airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
          )
            .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodeEndpointPrice')
            .withArgs(airnodeAddress, endpointId, price, roles.manager.address);
          priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeEndpointPrice(airnodeAddress, endpointId);
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
            airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
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
          airnodeEndpointFeeRegistry.connect(roles.manager).setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
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
        airnodeEndpointFeeRegistry
          .connect(roles.randomPerson)
          .setAirnodeEndpointPrice(airnodeAddress, endpointId, price)
      ).to.be.revertedWith('Sender cannot register');
    });
  });
});

describe('setAirnodeChainEndpointPrice', function () {
  context('Sender has the registrar role', function () {
    context('Airnode address is not zero', function () {
      context('Chain ID is not zero', function () {
        context('Price is not zero', function () {
          it('sets Airnode, chain, endpoint price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            const price = 123;
            let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainEndpointPrice(
              airnodeAddress,
              chainId,
              endpointId
            );
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointFeeRegistry
                .connect(roles.registrar)
                .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
            )
              .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodeChainEndpointPrice')
              .withArgs(airnodeAddress, chainId, endpointId, price, roles.registrar.address);
            priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainEndpointPrice(
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
              airnodeEndpointFeeRegistry
                .connect(roles.registrar)
                .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
            airnodeEndpointFeeRegistry
              .connect(roles.registrar)
              .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
          airnodeEndpointFeeRegistry
            .connect(roles.registrar)
            .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
            let priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainEndpointPrice(
              airnodeAddress,
              chainId,
              endpointId
            );
            expect(priceFetchAttempt.success).to.equal(false);
            expect(priceFetchAttempt.price).to.equal(0);
            await expect(
              airnodeEndpointFeeRegistry
                .connect(roles.manager)
                .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
            )
              .to.emit(airnodeEndpointFeeRegistry, 'SetAirnodeChainEndpointPrice')
              .withArgs(airnodeAddress, chainId, endpointId, price, roles.manager.address);
            priceFetchAttempt = await airnodeEndpointFeeRegistry.tryReadAirnodeChainEndpointPrice(
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
              airnodeEndpointFeeRegistry
                .connect(roles.manager)
                .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
            airnodeEndpointFeeRegistry
              .connect(roles.manager)
              .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
          airnodeEndpointFeeRegistry
            .connect(roles.manager)
            .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
        airnodeEndpointFeeRegistry
          .connect(roles.randomPerson)
          .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, price)
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
          airnodeEndpointFeeRegistry.connect(roles.registrar).setEndpointAndChainPricePriority(airnodeAddress, status)
        )
          .to.emit(airnodeEndpointFeeRegistry, 'SetEndpointAndChainPricePriority')
          .withArgs(airnodeAddress, status, roles.registrar.address);
        expect(await airnodeEndpointFeeRegistry.prioritizeEndpointPriceOverChainPrice(airnodeAddress)).to.equal(true);
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const status = true;
        await expect(
          airnodeEndpointFeeRegistry.connect(roles.registrar).setEndpointAndChainPricePriority(airnodeAddress, status)
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
          airnodeEndpointFeeRegistry.connect(roles.manager).setEndpointAndChainPricePriority(airnodeAddress, status)
        )
          .to.emit(airnodeEndpointFeeRegistry, 'SetEndpointAndChainPricePriority')
          .withArgs(airnodeAddress, status, roles.manager.address);
        expect(await airnodeEndpointFeeRegistry.prioritizeEndpointPriceOverChainPrice(airnodeAddress)).to.equal(true);
      });
    });
    context('Airnode address is zero', function () {
      it('reverts', async function () {
        const airnodeAddress = hre.ethers.constants.AddressZero;
        const status = true;
        await expect(
          airnodeEndpointFeeRegistry.connect(roles.manager).setEndpointAndChainPricePriority(airnodeAddress, status)
        ).to.be.revertedWith('Airnode address zero');
      });
    });
  });
  context('Sender does not have the registrar role and is not the manager', function () {
    it('reverts', async function () {
      const airnodeAddress = testUtils.generateRandomAddress();
      const status = true;
      await expect(
        airnodeEndpointFeeRegistry.connect(roles.randomPerson).setEndpointAndChainPricePriority(airnodeAddress, status)
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
      await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
      await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
      await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
      await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
      await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, 5);
      await airnodeEndpointFeeRegistry
        .connect(roles.registrar)
        .setAirnodeChainEndpointPrice(airnodeAddress, chainId, endpointId, 6);
      expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(6);
    });
  });
  context('Airnode, chain, endpoint price is not set', function () {
    context('Airnode, chain price is prioritized', function () {
      context('Airnode, chain price is set', function () {
        it('returns Airnode, chain price', async function () {
          const airnodeAddress = testUtils.generateRandomAddress();
          const chainId = 3;
          const endpointId = testUtils.generateRandomBytes32();
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
          await airnodeEndpointFeeRegistry
            .connect(roles.registrar)
            .setAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, 5);
          expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(5);
        });
      });
      context('Airnode, chain price is not set', function () {
        context('Airnode, endpoint price is set', function () {
          it('returns Airnode, endpoint price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
            await airnodeEndpointFeeRegistry
              .connect(roles.registrar)
              .setAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
            expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(4);
          });
        });
        context('Airnode, endpoint price is not set', function () {
          context('Airnode price is set', function () {
            it('returns Airnode price', async function () {
              const airnodeAddress = testUtils.generateRandomAddress();
              const chainId = 3;
              const endpointId = testUtils.generateRandomBytes32();
              await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
              await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
              await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
              expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(3);
            });
          });
          context('Airnode price is not set', function () {
            context('Default chain price is set', function () {
              it('returns default chain price', async function () {
                const airnodeAddress = testUtils.generateRandomAddress();
                const chainId = 3;
                const endpointId = testUtils.generateRandomBytes32();
                await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
                await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
                expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(2);
              });
            });
            context('Default chain price is not set', function () {
              context('Default price is set', function () {
                it('returns default price', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
                  expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(1);
                });
              });
              context('Default price is not set', function () {
                it('reverts', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await expect(
                    airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)
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
          await airnodeEndpointFeeRegistry
            .connect(roles.registrar)
            .setEndpointAndChainPricePriority(airnodeAddress, true);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
          await airnodeEndpointFeeRegistry
            .connect(roles.registrar)
            .setAirnodeEndpointPrice(airnodeAddress, endpointId, 4);
          await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, 5);
          expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(4);
        });
      });
      context('Airnode, endpoint price is not set', function () {
        context('Airnode, chain price is set', function () {
          it('returns Airnode, chain price', async function () {
            const airnodeAddress = testUtils.generateRandomAddress();
            const chainId = 3;
            const endpointId = testUtils.generateRandomBytes32();
            await airnodeEndpointFeeRegistry
              .connect(roles.registrar)
              .setEndpointAndChainPricePriority(airnodeAddress, true);
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
            await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodeChainPrice(airnodeAddress, chainId, 5);
            expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(5);
          });
        });
        context('Airnode, chain price is not set', function () {
          context('Airnode price is set', function () {
            it('returns Airnode price', async function () {
              const airnodeAddress = testUtils.generateRandomAddress();
              const chainId = 3;
              const endpointId = testUtils.generateRandomBytes32();
              await airnodeEndpointFeeRegistry
                .connect(roles.registrar)
                .setEndpointAndChainPricePriority(airnodeAddress, true);
              await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
              await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
              await airnodeEndpointFeeRegistry.connect(roles.registrar).setAirnodePrice(airnodeAddress, 3);
              expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(3);
            });
          });
          context('Airnode price is not set', function () {
            context('Default chain price is set', function () {
              it('returns default chain price', async function () {
                const airnodeAddress = testUtils.generateRandomAddress();
                const chainId = 3;
                const endpointId = testUtils.generateRandomBytes32();
                await airnodeEndpointFeeRegistry
                  .connect(roles.registrar)
                  .setEndpointAndChainPricePriority(airnodeAddress, true);
                await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
                await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultChainPrice(chainId, 2);
                expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(2);
              });
            });
            context('Default chain price is not set', function () {
              context('Default price is set', function () {
                it('returns default price', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await airnodeEndpointFeeRegistry
                    .connect(roles.registrar)
                    .setEndpointAndChainPricePriority(airnodeAddress, true);
                  await airnodeEndpointFeeRegistry.connect(roles.registrar).setDefaultPrice(1);
                  expect(await airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)).to.equal(1);
                });
              });
              context('Default price is not set', function () {
                it('reverts', async function () {
                  const airnodeAddress = testUtils.generateRandomAddress();
                  const chainId = 3;
                  const endpointId = testUtils.generateRandomBytes32();
                  await airnodeEndpointFeeRegistry
                    .connect(roles.registrar)
                    .setEndpointAndChainPricePriority(airnodeAddress, true);
                  await expect(
                    airnodeEndpointFeeRegistry.getPrice(airnodeAddress, chainId, endpointId)
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
