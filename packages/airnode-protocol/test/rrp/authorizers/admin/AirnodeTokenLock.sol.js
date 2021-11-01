/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../../utils');

let roles;
let accessControlRegistry, airnodeTokenLock;
let airnodeFeeRegistry, requesterAuthorizerWithManager;
let api3Token;
let airnodeTokenLockAdminRoleDescription = 'AirnodeTokenLock admin';
let requesterAuthorizerWithManagerAdminRoleDescription = 'RequesterAuthorizerWithManager admin';
let airnodeFeeRegistryAdminRoleDescription = 'AirnodeFeeRegistry admin';
let adminRole, oracleAddressSetterRole, coefficientAndRegistrySetterRole;
let optStatusSetterRole, blockWithdrawDestinationSetterRole, blockRequesterRole;
let requesterAuthorizerWithManagerSetterRole;
let airnodeAddress = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();
let endpointPrice;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    oracleAddressSetter: accounts[2],
    coefficientAndRegistrySetter: accounts[3],
    optStatusSetter: accounts[4],
    blockWithdrawDestinationSetter: accounts[5],
    blockRequester: accounts[6],
    requesterAuthorizerWithManagerSetter: accounts[7],
    requester: accounts[8],
    locker: accounts[9],
    anotherLocker: accounts[10],
    oracle: accounts[11],
    airnode: accounts[12],
    blockWithdrawDestination: accounts[13],
    randomPerson: accounts[14],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();

  // deploy AirnodeFeeRegistry contract
  const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
  airnodeFeeRegistry = await airnodeFeeRegistryFactory.deploy(
    accessControlRegistry.address,
    airnodeFeeRegistryAdminRoleDescription,
    roles.manager.address
  );

  // deploy Authorizer contract
  const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerWithManager',
    roles.deployer
  );
  requesterAuthorizerWithManager = await requesterAuthorizerWithManagerFactory.deploy(
    accessControlRegistry.address,
    requesterAuthorizerWithManagerAdminRoleDescription,
    roles.manager.address
  );

  // deploy api3Token
  const api3TokenFactory = await hre.ethers.getContractFactory('MockApi3Token', roles.deployer);
  api3Token = await api3TokenFactory.deploy(roles.deployer.address, roles.locker.address);
  await api3Token
    .connect(roles.locker)
    .transfer(roles.anotherLocker.address, hre.ethers.utils.parseEther((10e6).toString()));

  const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
  airnodeTokenLock = await airnodeTokenLockFactory.deploy(
    accessControlRegistry.address,
    airnodeTokenLockAdminRoleDescription,
    roles.manager.address,
    api3Token.address,
    airnodeFeeRegistry.address
  );

  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  adminRole = await airnodeTokenLock.adminRole();
  const requesterAuthorizerWithManagerAdminRole = await requesterAuthorizerWithManager.adminRole();

  oracleAddressSetterRole = await airnodeTokenLock.oracleAddressSetterRole();
  coefficientAndRegistrySetterRole = await airnodeTokenLock.coefficientAndRegistrySetterRole();
  optStatusSetterRole = await airnodeTokenLock.optStatusSetterRole();
  blockWithdrawDestinationSetterRole = await airnodeTokenLock.blockWithdrawDestinationSetterRole();
  blockRequesterRole = await airnodeTokenLock.blockRequesterRole();
  requesterAuthorizerWithManagerSetterRole = await airnodeTokenLock.requesterAuthorizerWithManagerSetterRole();

  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole, adminRole, adminRole, adminRole, adminRole],
    [
      airnodeTokenLockAdminRoleDescription,
      await airnodeTokenLock.ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION(),
      await airnodeTokenLock.COEFFICIENT_AND_REGISTRY_SETTER_ROLE_DESCRIPTION(),
      await airnodeTokenLock.OPT_STATUS_SETTER_ROLE_DESCRIPTION(),
      await airnodeTokenLock.BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION(),
      await airnodeTokenLock.BLOCK_REQUESTER_ROLE_DESCRIPTION(),
      await airnodeTokenLock.REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION(),
    ],
    [
      roles.manager.address, // which will already have been granted the role
      roles.oracleAddressSetter.address,
      roles.coefficientAndRegistrySetter.address,
      roles.optStatusSetter.address,
      roles.blockWithdrawDestinationSetter.address,
      roles.blockRequester.address,
      roles.requesterAuthorizerWithManagerSetter.address,
    ]
  );
  // Grant `roles.randomPerson` some invalid roles
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [
        managerRootRole,
        managerRootRole,
        managerRootRole,
        managerRootRole,
        managerRootRole,
        managerRootRole,
        managerRootRole,
      ],
      [
        Math.random(),
        await airnodeTokenLock.ORACLE_ADDRESS_SETTER_ROLE_DESCRIPTION(),
        await airnodeTokenLock.COEFFICIENT_AND_REGISTRY_SETTER_ROLE_DESCRIPTION(),
        await airnodeTokenLock.OPT_STATUS_SETTER_ROLE_DESCRIPTION(),
        await airnodeTokenLock.BLOCK_WITHDRAW_DESTINATION_SETTER_ROLE_DESCRIPTION(),
        await airnodeTokenLock.BLOCK_REQUESTER_ROLE_DESCRIPTION(),
        await airnodeTokenLock.REQUESTER_AUTHORIZER_WITH_MANAGER_SETTER_ROLE_DESCRIPTION(),
      ],
      [
        roles.randomPerson.address,
        roles.randomPerson.address,
        roles.randomPerson.address,
        roles.randomPerson.address,
        roles.randomPerson.address,
        roles.randomPerson.address,
        roles.randomPerson.address,
      ]
    );

  // Grant TokenLock Indefinite whitelister role
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [managerRootRole, requesterAuthorizerWithManagerAdminRole],
      [
        requesterAuthorizerWithManagerAdminRoleDescription,
        await requesterAuthorizerWithManager.INDEFINITE_WHITELISTER_ROLE_DESCRIPTION(),
      ],
      [roles.manager.address, airnodeTokenLock.address]
    );

  // Set the default Price to 100
  await airnodeFeeRegistry.connect(roles.manager).setDefaultPrice(100);

  endpointPrice = await airnodeFeeRegistry.defaultPrice();
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    context('Admin role description string is not empty', function () {
      context('Manager address is not zero', function () {
        context('Api3Token address is not zero', function () {
          context('AirnodeFeeRegistry address is not zero', function () {
            it('constructs', async function () {
              const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
              airnodeTokenLock = await airnodeTokenLockFactory.deploy(
                accessControlRegistry.address,
                airnodeTokenLockAdminRoleDescription,
                roles.manager.address,
                api3Token.address,
                airnodeFeeRegistry.address
              );
              expect(await airnodeTokenLock.accessControlRegistry()).to.equal(accessControlRegistry.address);
              expect(await airnodeTokenLock.adminRoleDescription()).to.equal(airnodeTokenLockAdminRoleDescription);
              expect(await airnodeTokenLock.manager()).to.equal(roles.manager.address);
              expect(await airnodeTokenLock.api3Token()).to.equal(api3Token.address);
              expect(await airnodeTokenLock.airnodeFeeRegistry()).to.equal(airnodeFeeRegistry.address);
            });
          });
          context('AinodeFeeRegistry address is zero', function () {
            it('reverts', async function () {
              const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
              airnodeTokenLock = await expect(
                airnodeTokenLockFactory.deploy(
                  accessControlRegistry.address,
                  airnodeTokenLockAdminRoleDescription,
                  roles.manager.address,
                  api3Token.address,
                  hre.ethers.constants.AddressZero
                )
              ).to.be.revertedWith('Zero address');
            });
          });
        });
        context('Api3Token address is zero', async function () {
          it('reverts', async function () {
            const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
            airnodeTokenLock = await expect(
              airnodeTokenLockFactory.deploy(
                accessControlRegistry.address,
                airnodeTokenLockAdminRoleDescription,
                roles.manager.address,
                hre.ethers.constants.AddressZero,
                airnodeFeeRegistry.address
              )
            ).to.be.revertedWith('Zero address');
          });
        });
      });
      context('Manager address is zero', function () {
        it('reverts', async function () {
          const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
          await expect(
            airnodeTokenLockFactory.deploy(
              accessControlRegistry.address,
              airnodeTokenLockAdminRoleDescription,
              hre.ethers.constants.AddressZero,
              api3Token.address,
              airnodeFeeRegistry.address
            )
          ).to.be.revertedWith('Manager address zero');
        });
      });
    });
    context('Admin role description string is empty', function () {
      it('reverts', async function () {
        const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
        await expect(
          airnodeTokenLockFactory.deploy(
            accessControlRegistry.address,
            '',
            roles.manager.address,
            api3Token.address,
            airnodeFeeRegistry.address
          )
        ).to.be.revertedWith('Admin role description empty');
      });
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const airnodeTokenLockFactory = await hre.ethers.getContractFactory('AirnodeTokenLock', roles.deployer);
      await expect(
        airnodeTokenLockFactory.deploy(
          hre.ethers.constants.AddressZero,
          airnodeTokenLockAdminRoleDescription,
          roles.manager.address,
          api3Token.address,
          airnodeFeeRegistry.address
        )
      ).to.be.revertedWith('ACR address zero');
    });
  });
});

describe('setAirnodeFeeRegistry', function () {
  context('Sender has coefficient and registry setter role or is manager', function () {
    context('AirnodeFeeRegistry address is being set', function () {
      context('address is valid', function () {
        it('sets the address', async function () {
          let airnodeFeeRegistryAddress;
          airnodeFeeRegistryAddress = await airnodeTokenLock.airnodeFeeRegistry();
          expect(airnodeFeeRegistryAddress).to.equal(airnodeFeeRegistry.address);
          await expect(
            airnodeTokenLock.connect(roles.coefficientAndRegistrySetter).setAirnodeFeeRegistry(airnodeAddress)
          )
            .to.emit(airnodeTokenLock, 'SetAirnodeFeeRegistry')
            .withArgs(airnodeAddress, roles.coefficientAndRegistrySetter.address);
          airnodeFeeRegistryAddress = await airnodeTokenLock.airnodeFeeRegistry();
          expect(airnodeFeeRegistryAddress).to.equal(airnodeAddress);

          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(coefficientAndRegistrySetterRole, roles.manager.address);

          await expect(airnodeTokenLock.connect(roles.manager).setAirnodeFeeRegistry(airnodeFeeRegistry.address))
            .to.emit(airnodeTokenLock, 'SetAirnodeFeeRegistry')
            .withArgs(airnodeFeeRegistry.address, roles.manager.address);
          airnodeFeeRegistryAddress = await airnodeTokenLock.airnodeFeeRegistry();
          expect(airnodeFeeRegistryAddress).to.equal(airnodeFeeRegistry.address);
        });
      });
      context('airnode address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock
              .connect(roles.coefficientAndRegistrySetter)
              .setAirnodeFeeRegistry(hre.ethers.constants.AddressZero)
          ).to.be.revertedWith('Zero address');
        });
      });
    });
  });
  context('Sender does not have the airnode flag and price setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).setAirnodeFeeRegistry(airnodeAddress)
      ).to.be.revertedWith('Not coefficient and registry setter');
    });
  });
});

describe('setOracle', function () {
  context('Sender has oracle address setter role or is manager', function () {
    context('Oracle address status is being set', function () {
      context('address is valid', function () {
        it('sets the status', async function () {
          let oracleStatus;
          oracleStatus = await airnodeTokenLock.isOracle(roles.oracle.address);
          expect(oracleStatus).to.equal(false);
          await expect(airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(roles.oracle.address, true))
            .to.emit(airnodeTokenLock, 'SetOracle')
            .withArgs(roles.oracle.address, true, roles.oracleAddressSetter.address);
          oracleStatus = await airnodeTokenLock.isOracle(roles.oracle.address);
          expect(oracleStatus).to.equal(true);

          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(oracleAddressSetterRole, roles.manager.address);

          await expect(airnodeTokenLock.connect(roles.manager).setOracle(roles.oracle.address, false))
            .to.emit(airnodeTokenLock, 'SetOracle')
            .withArgs(roles.oracle.address, false, roles.manager.address);
          oracleStatus = await airnodeTokenLock.isOracle(roles.oracle.address);
          expect(oracleStatus).to.equal(false);
        });
      });
      context('address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('Zero address');
        });
      });
    });
  });
  context('Sender does not have the oracle address setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).setOracle(roles.oracle.address, true)
      ).to.be.revertedWith('Not oracle address setter');
    });
  });
});

describe('setAPI3Price', function () {
  context('Sender is oracle', function () {
    context('API3 price is being set', function () {
      context('price is valid', function () {
        it('sets the multiplier coefficient', async function () {
          // Set the oracle address as oracle
          airnodeTokenLock.connect(roles.manager).setOracle(roles.oracle.address, true);

          let api3PriceInUsd;
          api3PriceInUsd = await airnodeTokenLock.api3PriceInUsd();
          expect(api3PriceInUsd).to.equal(0);
          await expect(
            airnodeTokenLock.connect(roles.oracle).setAPI3Price(hre.ethers.utils.parseUnits('7.5', 6).toString())
          )
            .to.emit(airnodeTokenLock, 'SetAPI3Price')
            .withArgs(hre.ethers.utils.parseUnits('7.5', 6).toString(), roles.oracle.address);
          api3PriceInUsd = await airnodeTokenLock.api3PriceInUsd();
          expect(api3PriceInUsd).to.equal(hre.ethers.utils.parseUnits('7.5', 6).toString());
        });
      });
      context('price is not valid', function () {
        it('reverts', async function () {
          airnodeTokenLock.connect(roles.manager).setOracle(roles.oracle.address, true);
          await expect(airnodeTokenLock.connect(roles.oracle).setAPI3Price(0)).to.be.revertedWith('Zero amount');
        });
      });
    });
  });
  context('Sender is not oracle', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).setAPI3Price(hre.ethers.utils.parseEther((1000).toString()))
      ).to.be.revertedWith('Not oracle');
    });
  });
});

describe('setMultiplierCoefficient', function () {
  context('Sender has coefficient and registry setter role or is manager', function () {
    context('multiplier coefficient is being set', function () {
      context('multiplier coefficient is valid', function () {
        it('sets the multiplier coefficient', async function () {
          let multiplierCoefficient;
          multiplierCoefficient = await airnodeTokenLock.multiplierCoefficient();
          expect(multiplierCoefficient).to.equal(0);
          await expect(
            airnodeTokenLock
              .connect(roles.coefficientAndRegistrySetter)
              .setMultiplierCoefficient(hre.ethers.utils.parseEther((1000).toString()))
          )
            .to.emit(airnodeTokenLock, 'SetMultiplierCoefficient')
            .withArgs(hre.ethers.utils.parseEther((1000).toString()), roles.coefficientAndRegistrySetter.address);
          multiplierCoefficient = await airnodeTokenLock.multiplierCoefficient();
          expect(multiplierCoefficient).to.equal(hre.ethers.utils.parseEther((1000).toString()));

          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(coefficientAndRegistrySetterRole, roles.manager.address);

          await expect(
            airnodeTokenLock
              .connect(roles.manager)
              .setMultiplierCoefficient(hre.ethers.utils.parseEther((1000).toString()))
          )
            .to.emit(airnodeTokenLock, 'SetMultiplierCoefficient')
            .withArgs(hre.ethers.utils.parseEther((1000).toString()), roles.manager.address);
          multiplierCoefficient = await airnodeTokenLock.multiplierCoefficient();
          expect(multiplierCoefficient).to.equal(hre.ethers.utils.parseEther((1000).toString()));
        });
      });
      context('multiplier coefficient is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock.connect(roles.coefficientAndRegistrySetter).setMultiplierCoefficient(0)
          ).to.be.revertedWith('Zero amount');
        });
      });
    });
  });
  context('Sender does not have the coefficient and registry setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock
          .connect(roles.randomPerson)
          .setMultiplierCoefficient(hre.ethers.utils.parseEther((1000).toString()))
      ).to.be.revertedWith('Not coefficient and registry setter');
    });
  });
});

describe('setOptInStatus', function () {
  context('Sender has opt status setter or is manager', function () {
    context('Opt in status is being set', function () {
      context('address is valid', function () {
        it('sets the status', async function () {
          let optInStatus;
          optInStatus = await airnodeTokenLock.airnodeOptInStatus(airnodeAddress);
          expect(optInStatus).to.equal(false);
          await expect(airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(airnodeAddress, true))
            .to.emit(airnodeTokenLock, 'SetOptInStatus')
            .withArgs(airnodeAddress, true, roles.optStatusSetter.address);
          optInStatus = await airnodeTokenLock.airnodeOptInStatus(airnodeAddress);
          expect(optInStatus).to.equal(true);

          await accessControlRegistry.connect(roles.manager).renounceRole(optStatusSetterRole, roles.manager.address);

          await expect(airnodeTokenLock.connect(roles.manager).setOptInStatus(airnodeAddress, false))
            .to.emit(airnodeTokenLock, 'SetOptInStatus')
            .withArgs(airnodeAddress, false, roles.manager.address);
          optInStatus = await airnodeTokenLock.airnodeOptInStatus(airnodeAddress);
          expect(optInStatus).to.equal(false);
        });
      });
      context('address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(hre.ethers.constants.AddressZero, true)
          ).to.be.revertedWith('Zero address');
        });
      });
    });
  });
  context('Sender does not have the oracle address setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).setOptInStatus(airnodeAddress, true)
      ).to.be.revertedWith('Not opt status setter');
    });
  });
});

describe('setSelfOptOutStatus', function () {
  context('Sender is airnode', function () {
    context('Opt out status is being set', function () {
      it('sets the status', async function () {
        let optOutStatus;
        optOutStatus = await airnodeTokenLock.airnodeSelfOptOutStatus(roles.airnode.address);
        expect(optOutStatus).to.equal(false);
        await expect(airnodeTokenLock.connect(roles.airnode).setSelfOptOutStatus(roles.airnode.address, true))
          .to.emit(airnodeTokenLock, 'SetSelfOptOutStatus')
          .withArgs(roles.airnode.address, true);
        optOutStatus = await airnodeTokenLock.airnodeSelfOptOutStatus(roles.airnode.address);
        expect(optOutStatus).to.equal(true);
      });
    });
  });
  context('Sender is not airnode', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.manager).setSelfOptOutStatus(roles.airnode.address, true)
      ).to.be.revertedWith('Not airnode');
    });
  });
});

describe('setRequesterAuthorizerWithManager', function () {
  context('Sender has requesterAuthorizerWithManager setter role or is manager', function () {
    context('AirnodeFeeRegistry address is being set', function () {
      context('chainId is valid', function () {
        context('address is valid', function () {
          it('sets the address', async function () {
            let requesterAuthorizerWithManagerEthereum;
            requesterAuthorizerWithManagerEthereum = await airnodeTokenLock.chainIdToRequesterAuthorizerWithManager(1);
            expect(requesterAuthorizerWithManagerEthereum).to.equal(hre.ethers.constants.AddressZero);
            await expect(
              airnodeTokenLock
                .connect(roles.requesterAuthorizerWithManagerSetter)
                .setRequesterAuthorizerWithManager(1, requesterAuthorizerWithManager.address)
            )
              .to.emit(airnodeTokenLock, 'SetRequesterAuthorizerWithManager')
              .withArgs(1, requesterAuthorizerWithManager.address, roles.requesterAuthorizerWithManagerSetter.address);
            requesterAuthorizerWithManagerEthereum = await airnodeTokenLock.chainIdToRequesterAuthorizerWithManager(1);

            expect(requesterAuthorizerWithManagerEthereum).to.equal(requesterAuthorizerWithManager.address);

            await accessControlRegistry
              .connect(roles.manager)
              .renounceRole(requesterAuthorizerWithManagerSetterRole, roles.manager.address);

            await expect(airnodeTokenLock.connect(roles.manager).setRequesterAuthorizerWithManager(1, airnodeAddress))
              .to.emit(airnodeTokenLock, 'SetRequesterAuthorizerWithManager')
              .withArgs(1, airnodeAddress, roles.manager.address);
            requesterAuthorizerWithManagerEthereum = await airnodeTokenLock.chainIdToRequesterAuthorizerWithManager(1);
            expect(requesterAuthorizerWithManagerEthereum).to.equal(airnodeAddress);
          });
        });
        context('airnode address is not valid', function () {
          it('reverts', async function () {
            await expect(
              airnodeTokenLock
                .connect(roles.requesterAuthorizerWithManagerSetter)
                .setRequesterAuthorizerWithManager(1, hre.ethers.constants.AddressZero)
            ).to.be.revertedWith('Zero address');
          });
        });
      });
      context('chainId is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock
              .connect(roles.requesterAuthorizerWithManagerSetter)
              .setRequesterAuthorizerWithManager(0, hre.ethers.constants.AddressZero)
          ).to.be.revertedWith('Zero chainId');
        });
      });
    });
  });
  context('Sender has requesterAuthorizerWithManager setter role or is manager', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).setRequesterAuthorizerWithManager(0, airnodeAddress)
      ).to.be.revertedWith('Not RequesterAuthorizerWithManagerSetter');
    });
  });
});

describe('setBlockWithdrawDestination', function () {
  context('Sender has blockWithdrawDestination setter role or is manager', function () {
    context('blockWithdrawDestination address is being set', function () {
      context('address is valid', function () {
        it('sets the address', async function () {
          let blockWithdrawDestinationAddress;
          blockWithdrawDestinationAddress = await airnodeTokenLock.blockWithdrawDestination();
          expect(blockWithdrawDestinationAddress).to.equal(hre.ethers.constants.AddressZero);
          await expect(
            airnodeTokenLock
              .connect(roles.blockWithdrawDestinationSetter)
              .setBlockWithdrawDestination(roles.blockWithdrawDestination.address)
          )
            .to.emit(airnodeTokenLock, 'SetBlockWithdrawDestination')
            .withArgs(roles.blockWithdrawDestination.address, roles.blockWithdrawDestinationSetter.address);
          blockWithdrawDestinationAddress = await airnodeTokenLock.blockWithdrawDestination();
          expect(blockWithdrawDestinationAddress).to.equal(roles.blockWithdrawDestination.address);

          await accessControlRegistry
            .connect(roles.manager)
            .renounceRole(blockWithdrawDestinationSetterRole, roles.manager.address);

          await expect(airnodeTokenLock.connect(roles.manager).setBlockWithdrawDestination(airnodeAddress))
            .to.emit(airnodeTokenLock, 'SetBlockWithdrawDestination')
            .withArgs(airnodeAddress, roles.manager.address);
          blockWithdrawDestinationAddress = await airnodeTokenLock.blockWithdrawDestination();
          expect(blockWithdrawDestinationAddress).to.equal(airnodeAddress);
        });
      });
      context('airnode address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock
              .connect(roles.blockWithdrawDestinationSetter)
              .setBlockWithdrawDestination(hre.ethers.constants.AddressZero)
          ).to.be.revertedWith('Zero address');
        });
      });
    });
  });
  context('Sender does not have the blockWithdrawDestination setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).setBlockWithdrawDestination(airnodeAddress)
      ).to.be.revertedWith('Not block withdraw destination setter');
    });
  });
});

describe('blockRequester', function () {
  context('Sender has blockRequester role or is manager', function () {
    context('requester is being blocked on airnode', function () {
      context('requester address is valid', function () {
        it('sets the block', async function () {
          let airnodeToRequesterToBlockStatus;
          airnodeToRequesterToBlockStatus = await airnodeTokenLock.airnodeToRequesterToBlockStatus(
            airnodeAddress,
            roles.requester.address
          );
          expect(airnodeToRequesterToBlockStatus).to.equal(false);
          await expect(
            airnodeTokenLock.connect(roles.blockRequester).blockRequester(airnodeAddress, roles.requester.address)
          )
            .to.emit(airnodeTokenLock, 'BlockedRequester')
            .withArgs(airnodeAddress, roles.requester.address, roles.blockRequester.address);
          airnodeToRequesterToBlockStatus = await airnodeTokenLock.airnodeToRequesterToBlockStatus(
            airnodeAddress,
            roles.requester.address
          );
          expect(airnodeToRequesterToBlockStatus).to.equal(true);

          await accessControlRegistry.connect(roles.manager).renounceRole(blockRequesterRole, roles.manager.address);

          await expect(airnodeTokenLock.connect(roles.manager).blockRequester(airnodeAddress, roles.locker.address))
            .to.emit(airnodeTokenLock, 'BlockedRequester')
            .withArgs(airnodeAddress, roles.locker.address, roles.manager.address);
          airnodeToRequesterToBlockStatus = await airnodeTokenLock.airnodeToRequesterToBlockStatus(
            airnodeAddress,
            roles.locker.address
          );
          expect(airnodeToRequesterToBlockStatus).to.equal(true);
        });
      });
      context('requster address is not valid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock
              .connect(roles.blockRequester)
              .blockRequester(airnodeAddress, hre.ethers.constants.AddressZero)
          ).to.be.revertedWith('Zero address');
        });
      });
    });
  });
  context('Sender does not have the block requester role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.randomPerson).blockRequester(airnodeAddress, roles.requester.address)
      ).to.be.revertedWith('Not block requester');
    });
  });
});

describe('getLockAmount', function () {
  beforeEach(async () => {
    await airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(roles.oracle.address, true);
    await airnodeTokenLock.connect(roles.oracle).setAPI3Price(hre.ethers.utils.parseUnits('7.5', 6).toString());
    await airnodeTokenLock
      .connect(roles.coefficientAndRegistrySetter)
      .setMultiplierCoefficient(hre.ethers.utils.parseEther((10).toString()));
  });
  it('returns the lockAmount', async function () {
    const price = await airnodeTokenLock.connect(roles.requester).getLockAmount(1, airnodeAddress, endpointId);
    const api3Price = await airnodeTokenLock.api3PriceInUsd();
    const multiplierCoefficient = await airnodeTokenLock.multiplierCoefficient();
    expect(price).to.equal(multiplierCoefficient.mul(endpointPrice).div(api3Price));
  });
});

describe('lockerToLockAmount', function () {
  beforeEach(async () => {
    await airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(roles.oracle.address, true);
    await airnodeTokenLock.connect(roles.oracle).setAPI3Price(hre.ethers.utils.parseUnits('7.5', 6).toString());
    await airnodeTokenLock
      .connect(roles.coefficientAndRegistrySetter)
      .setMultiplierCoefficient(hre.ethers.utils.parseEther((10).toString()));
    await airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(airnodeAddress, true);
    await airnodeTokenLock
      .connect(roles.requesterAuthorizerWithManagerSetter)
      .setRequesterAuthorizerWithManager(1, requesterAuthorizerWithManager.address);

    await api3Token
      .connect(roles.locker)
      .approve(airnodeTokenLock.address, await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId));
  });
  it('returns the amount locked by the locker', async function () {
    let lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
      1,
      airnodeAddress,
      endpointId,
      roles.requester.address,
      roles.locker.address
    );
    expect(lockerLockAmount).to.equal(0);

    await airnodeTokenLock.connect(roles.locker).lock(1, airnodeAddress, endpointId, roles.requester.address);

    lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
      1,
      airnodeAddress,
      endpointId,
      roles.requester.address,
      roles.locker.address
    );

    expect(lockerLockAmount).to.equal(await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId));
  });
});

describe('lock', function () {
  beforeEach(async () => {
    await airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(roles.oracle.address, true);
    await airnodeTokenLock.connect(roles.oracle).setAPI3Price(hre.ethers.utils.parseUnits('7.5', 6).toString());
    await airnodeTokenLock
      .connect(roles.requesterAuthorizerWithManagerSetter)
      .setRequesterAuthorizerWithManager(1, requesterAuthorizerWithManager.address);
    await airnodeTokenLock
      .connect(roles.coefficientAndRegistrySetter)
      .setMultiplierCoefficient(hre.ethers.utils.parseEther((10).toString()));
  });
  context('airnode is opted in or not opted out', function () {
    beforeEach(async () => {
      await airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(airnodeAddress, true);
    });
    context('requester is not blocked on airnode', function () {
      context('chainId is valid', function () {
        context('airnode is valid', function () {
          context('requester address is valid', function () {
            context('locker has not already locked', function () {
              context('locker has sufficient amount to lock', function () {
                it('locks tokens and whitelists the requester', async function () {
                  await api3Token
                    .connect(roles.locker)
                    .approve(
                      airnodeTokenLock.address,
                      await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)
                    );

                  await api3Token
                    .connect(roles.anotherLocker)
                    .approve(
                      airnodeTokenLock.address,
                      await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)
                    );

                  let beforeBalance = await api3Token.balanceOf(roles.locker.address);
                  const lockAmount = await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId);
                  let whitelistStatus =
                    await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address
                    );
                  let tokenLocks = await airnodeTokenLock.tokenLocks(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address
                  );
                  expect(tokenLocks).to.equal(0);

                  let lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.locker.address
                  );

                  expect(lockerLockAmount).to.equal(0);

                  expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  await expect(
                    airnodeTokenLock.connect(roles.locker).lock(1, airnodeAddress, endpointId, roles.requester.address)
                  )
                    .to.emit(airnodeTokenLock, 'Locked')
                    .withArgs(
                      1,
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.locker.address,
                      await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId),
                      1
                    );
                  let afterBalance = await api3Token.balanceOf(roles.locker.address);
                  expect(afterBalance).to.equal(beforeBalance.sub(lockAmount));
                  whitelistStatus =
                    await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address
                    );
                  expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

                  tokenLocks = await airnodeTokenLock.tokenLocks(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address
                  );
                  expect(tokenLocks).to.equal(1);

                  lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.locker.address
                  );

                  expect(lockerLockAmount).to.equal(beforeBalance.sub(afterBalance));

                  beforeBalance = await api3Token.balanceOf(roles.anotherLocker.address);
                  await expect(
                    airnodeTokenLock
                      .connect(roles.anotherLocker)
                      .lock(1, airnodeAddress, endpointId, roles.requester.address)
                  )
                    .to.emit(airnodeTokenLock, 'Locked')
                    .withArgs(
                      1,
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.anotherLocker.address,
                      await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId),
                      2
                    );

                  afterBalance = await api3Token.balanceOf(roles.anotherLocker.address);
                  expect(afterBalance).to.equal(beforeBalance.sub(lockAmount));
                  whitelistStatus =
                    await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                      airnodeAddress,
                      endpointId,
                      roles.requester.address
                    );

                  expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

                  tokenLocks = await airnodeTokenLock.tokenLocks(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address
                  );
                  expect(tokenLocks).to.equal(2);

                  lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.anotherLocker.address
                  );

                  expect(lockerLockAmount).to.equal(beforeBalance.sub(afterBalance));
                });
              });
              context('locker does not have sufficient amount to lock', function () {
                it('reverts', async function () {
                  await expect(
                    airnodeTokenLock
                      .connect(roles.requester)
                      .lock(1, airnodeAddress, endpointId, roles.requester.address)
                  ).to.be.revertedWith('Insufficient amount');
                });
              });
            });
            context('locker has already locked', function () {
              it('reverts', async function () {
                await api3Token
                  .connect(roles.locker)
                  .approve(
                    airnodeTokenLock.address,
                    (await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)).mul(2)
                  );

                await airnodeTokenLock
                  .connect(roles.locker)
                  .lock(1, airnodeAddress, endpointId, roles.requester.address);

                await expect(
                  airnodeTokenLock.connect(roles.locker).lock(1, airnodeAddress, endpointId, roles.requester.address)
                ).to.be.revertedWith('Already locked');
              });
            });
          });
          context('requester address is invalid', function () {
            it('reverts', async function () {
              await expect(
                airnodeTokenLock
                  .connect(roles.locker)
                  .lock(1, airnodeAddress, endpointId, hre.ethers.constants.AddressZero)
              ).to.be.revertedWith('Zero address');
            });
          });
        });
        context('airnode is invalid', function () {
          it('reverts', async function () {
            await expect(
              airnodeTokenLock
                .connect(roles.locker)
                .lock(1, hre.ethers.constants.AddressZero, endpointId, roles.requester.address)
            ).to.be.revertedWith('Airnode not opted in'); // This check happens first
          });
        });
      });
      context('chainId is invalid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock.connect(roles.locker).lock(0, airnodeAddress, endpointId, roles.requester.address)
          ).to.be.revertedWith('Zero chainId');
        });
      });
    });
    context('requester is blocked on airnode', function () {
      it('reverts', async function () {
        await airnodeTokenLock.connect(roles.blockRequester).blockRequester(airnodeAddress, roles.requester.address);

        await expect(
          airnodeTokenLock.connect(roles.locker).lock(0, airnodeAddress, endpointId, roles.requester.address)
        ).to.be.revertedWith('Requester blocked');
      });
    });

    context('requester is blocked globally', function () {
      it('reverts', async function () {
        await airnodeTokenLock
          .connect(roles.blockRequester)
          .blockRequester(hre.ethers.constants.AddressZero, roles.requester.address);

        await expect(
          airnodeTokenLock.connect(roles.locker).lock(0, airnodeAddress, endpointId, roles.requester.address)
        ).to.be.revertedWith('Requester blocked');
      });
    });
  });
  context("airnode isn't opted in", function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock.connect(roles.locker).lock(1, airnodeAddress, endpointId, roles.requester.address)
      ).to.be.revertedWith('Airnode not opted in');
    });
  });
  context('airnode has opted out', function () {
    it('reverts', async function () {
      airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(roles.airnode.address, true);
      airnodeTokenLock.connect(roles.airnode).setSelfOptOutStatus(roles.airnode.address, true);

      await expect(
        airnodeTokenLock.connect(roles.locker).lock(1, roles.airnode.address, endpointId, roles.requester.address)
      ).to.be.revertedWith('Airnode not opted in');
    });
  });
});

describe('unlock', function () {
  beforeEach(async () => {
    await airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(roles.oracle.address, true);
    await airnodeTokenLock.connect(roles.oracle).setAPI3Price(hre.ethers.utils.parseUnits('7.5', 6).toString());
    await airnodeTokenLock
      .connect(roles.requesterAuthorizerWithManagerSetter)
      .setRequesterAuthorizerWithManager(1, requesterAuthorizerWithManager.address);
    await airnodeTokenLock
      .connect(roles.coefficientAndRegistrySetter)
      .setMultiplierCoefficient(hre.ethers.utils.parseEther((10).toString()));
    await airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(airnodeAddress, true);
  });
  context('requester is not blocked on airnode', function () {
    context('chainId is valid', function () {
      context('airnode is valid', function () {
        context('requester address is valid', function () {
          context('locker has locked', function () {
            beforeEach(async () => {
              await api3Token
                .connect(roles.locker)
                .approve(airnodeTokenLock.address, await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId));

              await api3Token
                .connect(roles.anotherLocker)
                .approve(airnodeTokenLock.address, await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId));

              await airnodeTokenLock.connect(roles.locker).lock(1, airnodeAddress, endpointId, roles.requester.address);

              await airnodeTokenLock
                .connect(roles.anotherLocker)
                .lock(1, airnodeAddress, endpointId, roles.requester.address);
            });
            it('locks unlocks tokens and unwhitelists the requester', async function () {
              let beforeBalance = await api3Token.balanceOf(roles.locker.address);
              const lockAmount = await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId);
              let whitelistStatus =
                await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                  airnodeAddress,
                  endpointId,
                  roles.requester.address
                );
              let tokenLocks = await airnodeTokenLock.tokenLocks(
                1,
                airnodeAddress,
                endpointId,
                roles.requester.address
              );
              expect(tokenLocks).to.equal(2);

              let lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                1,
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.locker.address
              );

              expect(lockerLockAmount).to.equal(lockAmount);

              expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
              await expect(
                airnodeTokenLock.connect(roles.locker).unlock(1, airnodeAddress, endpointId, roles.requester.address)
              )
                .to.emit(airnodeTokenLock, 'Unlocked')
                .withArgs(
                  1,
                  airnodeAddress,
                  endpointId,
                  roles.requester.address,
                  roles.locker.address,
                  await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId),
                  1
                );
              let afterBalance = await api3Token.balanceOf(roles.locker.address);
              expect(afterBalance).to.equal(beforeBalance.add(lockAmount));
              whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address
              );
              expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

              tokenLocks = await airnodeTokenLock.tokenLocks(1, airnodeAddress, endpointId, roles.requester.address);
              expect(tokenLocks).to.equal(1);

              lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                1,
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.locker.address
              );

              expect(lockerLockAmount).to.equal(0);

              beforeBalance = await api3Token.balanceOf(roles.anotherLocker.address);
              await expect(
                airnodeTokenLock
                  .connect(roles.anotherLocker)
                  .unlock(1, airnodeAddress, endpointId, roles.requester.address)
              )
                .to.emit(airnodeTokenLock, 'Unlocked')
                .withArgs(
                  1,
                  airnodeAddress,
                  endpointId,
                  roles.requester.address,
                  roles.anotherLocker.address,
                  await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId),
                  0
                );

              afterBalance = await api3Token.balanceOf(roles.anotherLocker.address);
              expect(afterBalance).to.equal(beforeBalance.add(lockAmount));
              whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                airnodeAddress,
                endpointId,
                roles.requester.address
              );

              expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

              tokenLocks = await airnodeTokenLock.tokenLocks(1, airnodeAddress, endpointId, roles.requester.address);
              expect(tokenLocks).to.equal(0);

              lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                1,
                airnodeAddress,
                endpointId,
                roles.requester.address,
                roles.anotherLocker.address
              );

              expect(lockerLockAmount).to.equal(0);
            });
          });
          context('locker has not locked', function () {
            it('reverts', async function () {
              await expect(
                airnodeTokenLock.connect(roles.locker).unlock(1, airnodeAddress, endpointId, roles.requester.address)
              ).to.be.revertedWith('No amount locked');
            });
          });
        });
        context('requester address is invalid', function () {
          it('reverts', async function () {
            await expect(
              airnodeTokenLock
                .connect(roles.locker)
                .unlock(1, airnodeAddress, endpointId, hre.ethers.constants.AddressZero)
            ).to.be.revertedWith('Zero address');
          });
        });
      });
      context('airnode is invalid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenLock
              .connect(roles.locker)
              .unlock(1, hre.ethers.constants.AddressZero, endpointId, roles.requester.address)
          ).to.be.revertedWith('Zero address'); // This check happens first
        });
      });
    });
    context('chainId is invalid', function () {
      it('reverts', async function () {
        await expect(
          airnodeTokenLock.connect(roles.locker).unlock(0, airnodeAddress, endpointId, roles.requester.address)
        ).to.be.revertedWith('Zero chainId');
      });
    });
  });
  context('requester is blocked on airnode', function () {
    it('reverts', async function () {
      await airnodeTokenLock.connect(roles.blockRequester).blockRequester(airnodeAddress, roles.requester.address);

      await expect(
        airnodeTokenLock.connect(roles.locker).unlock(0, airnodeAddress, endpointId, roles.requester.address)
      ).to.be.revertedWith('Requester blocked');
    });
  });

  context('requester is blocked globally', function () {
    it('reverts', async function () {
      await airnodeTokenLock
        .connect(roles.blockRequester)
        .blockRequester(hre.ethers.constants.AddressZero, roles.requester.address);

      await expect(
        airnodeTokenLock.connect(roles.locker).unlock(0, airnodeAddress, endpointId, roles.requester.address)
      ).to.be.revertedWith('Requester blocked');
    });
  });
});

describe('withdrawBlocked', function () {
  beforeEach(async () => {
    await airnodeTokenLock.connect(roles.oracleAddressSetter).setOracle(roles.oracle.address, true);
    await airnodeTokenLock.connect(roles.oracle).setAPI3Price(hre.ethers.utils.parseUnits('7.5', 6).toString());
    await airnodeTokenLock
      .connect(roles.requesterAuthorizerWithManagerSetter)
      .setRequesterAuthorizerWithManager(1, requesterAuthorizerWithManager.address);
    await airnodeTokenLock
      .connect(roles.coefficientAndRegistrySetter)
      .setMultiplierCoefficient(hre.ethers.utils.parseEther((10).toString()));
    await airnodeTokenLock.connect(roles.optStatusSetter).setOptInStatus(airnodeAddress, true);
    airnodeTokenLock
      .connect(roles.blockWithdrawDestinationSetter)
      .setBlockWithdrawDestination(roles.blockWithdrawDestination.address);
  });
  context('requester is blocked on airnode or globally', function () {
    context('chainId is valid', function () {
      context('airnode is valid', function () {
        context('requester address is valid', function () {
          context('locker address is valid', function () {
            context('locker has locked', function () {
              beforeEach(async () => {
                await api3Token
                  .connect(roles.locker)
                  .approve(
                    airnodeTokenLock.address,
                    await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)
                  );

                await api3Token
                  .connect(roles.anotherLocker)
                  .approve(
                    airnodeTokenLock.address,
                    await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)
                  );

                await airnodeTokenLock
                  .connect(roles.locker)
                  .lock(1, airnodeAddress, endpointId, roles.requester.address);

                await airnodeTokenLock
                  .connect(roles.anotherLocker)
                  .lock(1, airnodeAddress, endpointId, roles.requester.address);

                await airnodeTokenLock
                  .connect(roles.blockRequester)
                  .blockRequester(airnodeAddress, roles.requester.address);
              });
              it('locks unwhitelists the requester when all are withdrawn', async function () {
                let beforeBalance = await api3Token.balanceOf(roles.blockWithdrawDestination.address);
                const lockAmount = await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId);
                let whitelistStatus =
                  await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                    airnodeAddress,
                    endpointId,
                    roles.requester.address
                  );
                let tokenLocks = await airnodeTokenLock.tokenLocks(
                  1,
                  airnodeAddress,
                  endpointId,
                  roles.requester.address
                );
                expect(tokenLocks).to.equal(2);

                let lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                  1,
                  airnodeAddress,
                  endpointId,
                  roles.requester.address,
                  roles.locker.address
                );

                expect(lockerLockAmount).to.equal(lockAmount);

                expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);
                await expect(
                  airnodeTokenLock
                    .connect(roles.randomPerson)
                    .withdrawBlocked(1, airnodeAddress, endpointId, roles.requester.address, roles.locker.address)
                )
                  .to.emit(airnodeTokenLock, 'WithdrewBlocked')
                  .withArgs(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.locker.address,
                    roles.blockWithdrawDestination.address,
                    await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)
                  );
                let afterBalance = await api3Token.balanceOf(roles.blockWithdrawDestination.address);
                expect(afterBalance).to.equal(beforeBalance.add(lockAmount));
                whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                  airnodeAddress,
                  endpointId,
                  roles.requester.address
                );
                expect(whitelistStatus.indefiniteWhitelistCount).to.equal(1);

                tokenLocks = await airnodeTokenLock.tokenLocks(1, airnodeAddress, endpointId, roles.requester.address);
                expect(tokenLocks).to.equal(1);

                lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                  1,
                  airnodeAddress,
                  endpointId,
                  roles.requester.address,
                  roles.locker.address
                );

                expect(lockerLockAmount).to.equal(0);

                beforeBalance = await api3Token.balanceOf(roles.blockWithdrawDestination.address);
                await expect(
                  airnodeTokenLock
                    .connect(roles.randomPerson)
                    .withdrawBlocked(
                      1,
                      airnodeAddress,
                      endpointId,
                      roles.requester.address,
                      roles.anotherLocker.address
                    )
                )
                  .to.emit(airnodeTokenLock, 'WithdrewBlocked')
                  .withArgs(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    roles.anotherLocker.address,
                    roles.blockWithdrawDestination.address,
                    await airnodeTokenLock.getLockAmount(1, airnodeAddress, endpointId)
                  );

                afterBalance = await api3Token.balanceOf(roles.blockWithdrawDestination.address);
                expect(afterBalance).to.equal(beforeBalance.add(lockAmount));
                whitelistStatus = await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                  airnodeAddress,
                  endpointId,
                  roles.requester.address
                );

                expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                tokenLocks = await airnodeTokenLock.tokenLocks(1, airnodeAddress, endpointId, roles.requester.address);
                expect(tokenLocks).to.equal(0);

                lockerLockAmount = await airnodeTokenLock.lockerToLockAmount(
                  1,
                  airnodeAddress,
                  endpointId,
                  roles.requester.address,
                  roles.anotherLocker.address
                );

                expect(lockerLockAmount).to.equal(0);
              });
            });
            context('locker has not locked', function () {
              it('reverts', async function () {
                await airnodeTokenLock
                  .connect(roles.blockRequester)
                  .blockRequester(airnodeAddress, roles.requester.address);

                await expect(
                  airnodeTokenLock
                    .connect(roles.randomPerson)
                    .withdrawBlocked(1, airnodeAddress, endpointId, roles.requester.address, roles.locker.address)
                ).to.be.revertedWith('No amount locked');
              });
            });
          });
          context('locker address is not valid', function () {
            it('reverts', async function () {
              await airnodeTokenLock
                .connect(roles.blockRequester)
                .blockRequester(airnodeAddress, roles.requester.address);

              await expect(
                airnodeTokenLock
                  .connect(roles.randomPerson)
                  .withdrawBlocked(
                    1,
                    airnodeAddress,
                    endpointId,
                    roles.requester.address,
                    hre.ethers.constants.AddressZero
                  )
              ).to.be.revertedWith('Zero address');
            });
          });
        });
        context('requester address is invalid', function () {
          it('reverts', async function () {
            await airnodeTokenLock
              .connect(roles.blockRequester)
              .blockRequester(airnodeAddress, roles.requester.address);

            await expect(
              airnodeTokenLock
                .connect(roles.randomPerson)
                .withdrawBlocked(1, airnodeAddress, endpointId, hre.ethers.constants.AddressZero, roles.locker.address)
            ).to.be.revertedWith('Requester not blocked');
          });
        });
      });
      context('airnode is invalid', function () {
        it('reverts', async function () {
          await airnodeTokenLock
            .connect(roles.blockRequester)
            .blockRequester(hre.ethers.constants.AddressZero, roles.requester.address);

          await expect(
            airnodeTokenLock
              .connect(roles.randomPerson)
              .withdrawBlocked(
                1,
                hre.ethers.constants.AddressZero,
                endpointId,
                roles.requester.address,
                roles.locker.address
              )
          ).to.be.revertedWith('Zero address'); // This check happens first
        });
      });
    });
    context('chainId is invalid', function () {
      it('reverts', async function () {
        await airnodeTokenLock.connect(roles.blockRequester).blockRequester(airnodeAddress, roles.requester.address);

        await expect(
          airnodeTokenLock
            .connect(roles.locker)
            .withdrawBlocked(0, airnodeAddress, endpointId, roles.requester.address, roles.locker.address)
        ).to.be.revertedWith('Zero chainId');
      });
    });
  });
  context('requester is not blocked', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenLock
          .connect(roles.locker)
          .withdrawBlocked(1, airnodeAddress, endpointId, roles.requester.address, roles.locker.address)
      ).to.be.revertedWith('Requester not blocked');
    });
  });
});
