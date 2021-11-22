/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const utils = require('../../../utils');

const chainId = 1;
const oneDayInSeconds = 24 * 60 * 60;
const thirtyDaysInSeconds = 30 * oneDayInSeconds;

let roles;
let accessControlRegistry, airnodeTokenPayment;
let airnodeFeeRegistry, requesterAuthorizerWithManager, airnodeRequesterAuthorizerRegistry;
let api3Token;
let airnodeTokenPaymentAdminRoleDescription = 'AirnodeTokenPayment admin';
let requesterAuthorizerWithManagerAdminRoleDescription = 'RequesterAuthorizerWithManager admin';
let airnodeFeeRegistryAdminRoleDescription = 'AirnodeFeeRegistry admin';
let adminRole,
  paymentTokenPriceSetterRole,
  airnodeToMinimumWhitelistDurationSetterRole,
  airnodeToPaymentDestinationSetterRole;
let airnodePaymentDestination = utils.generateRandomAddress();
let endpointId = utils.generateRandomBytes32();

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    oracle: accounts[2],
    airnode: accounts[3],
    requester: accounts[4],
    payer: accounts[5],
    anotherPayer: accounts[6],
    randomPerson: accounts[7],
  };

  // Deploy AccessControlRegistry contract
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();

  // Deploy RequsterAuthorizer contract
  const requesterAuthorizerWithManagerFactory = await hre.ethers.getContractFactory(
    'RequesterAuthorizerWithManager',
    roles.deployer
  );
  requesterAuthorizerWithManager = await requesterAuthorizerWithManagerFactory.deploy(
    accessControlRegistry.address,
    requesterAuthorizerWithManagerAdminRoleDescription,
    roles.manager.address
  );

  // Deploy RequesterAuthorizerRegistry contract
  airnodeRequesterAuthorizerRegistry = await hre.ethers.getContractFactory(
    'AirnodeRequesterAuthorizerRegistry',
    roles.deployer
  );
  airnodeRequesterAuthorizerRegistry = await airnodeRequesterAuthorizerRegistry.deploy();
  airnodeRequesterAuthorizerRegistry
    .connect(roles.deployer)
    .setRequesterAuthorizerWithManager(chainId, requesterAuthorizerWithManager.address);

  // Deploy AirnodeFeeRegistry contract
  const airnodeFeeRegistryFactory = await hre.ethers.getContractFactory('AirnodeFeeRegistry', roles.deployer);
  airnodeFeeRegistry = await airnodeFeeRegistryFactory.deploy(
    accessControlRegistry.address,
    airnodeFeeRegistryAdminRoleDescription,
    roles.manager.address
  );

  // Deploy MockApi3Token contract
  const api3TokenFactory = await hre.ethers.getContractFactory('MockApi3Token', roles.deployer);
  api3Token = await api3TokenFactory.deploy(roles.deployer.address, roles.payer.address);
  await api3Token
    .connect(roles.payer)
    .transfer(roles.anotherPayer.address, hre.ethers.utils.parseEther((10e6).toString()));

  // Deploy AirnodeTokenPayment contract
  const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory('AirnodeTokenPayment', roles.deployer);
  airnodeTokenPayment = await airnodeTokenPaymentFactory.deploy(
    accessControlRegistry.address,
    airnodeTokenPaymentAdminRoleDescription,
    roles.manager.address,
    airnodeRequesterAuthorizerRegistry.address,
    airnodeFeeRegistry.address,
    api3Token.address
  );

  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);

  const requesterAuthorizerWithManagerAdminRole = await requesterAuthorizerWithManager.adminRole();

  adminRole = await airnodeTokenPayment.adminRole();
  paymentTokenPriceSetterRole = await airnodeTokenPayment.paymentTokenPriceSetterRole();
  airnodeToMinimumWhitelistDurationSetterRole = await airnodeTokenPayment.airnodeToWhitelistDurationSetterRole();
  airnodeToPaymentDestinationSetterRole = await airnodeTokenPayment.airnodeToPaymentDestinationSetterRole();

  // Grant roles to valid accounts
  await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
    [managerRootRole, adminRole, adminRole, adminRole],
    [
      airnodeTokenPaymentAdminRoleDescription,
      await airnodeTokenPayment.PAYMENT_TOKEN_PRICE_SETTER_ROLE_DESCRIPTION(),
      await airnodeTokenPayment.AIRNODE_TO_WHITELIST_DURATION_SETTER_ROLE_DESCRIPTION(),
      await airnodeTokenPayment.AIRNODE_TO_PAYMENT_DESTINATION_SETTER_ROLE_DESCRIPTION(),
    ],
    [
      roles.manager.address, // which will already have been granted the role
      roles.oracle.address,
      roles.airnode.address,
      roles.airnode.address,
    ]
  );
  // Grant `roles.randomPerson` some invalid roles
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [managerRootRole, managerRootRole, managerRootRole, managerRootRole],
      [
        Math.random(),
        await airnodeTokenPayment.PAYMENT_TOKEN_PRICE_SETTER_ROLE_DESCRIPTION(),
        await airnodeTokenPayment.AIRNODE_TO_WHITELIST_DURATION_SETTER_ROLE_DESCRIPTION(),
        await airnodeTokenPayment.AIRNODE_TO_PAYMENT_DESTINATION_SETTER_ROLE_DESCRIPTION(),
      ],
      [roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address, roles.randomPerson.address]
    );
  // Grant AirnodeTokenPayment contract the whitelist expiration extender role
  await accessControlRegistry
    .connect(roles.manager)
    .initializeAndGrantRoles(
      [managerRootRole, requesterAuthorizerWithManagerAdminRole],
      [
        requesterAuthorizerWithManagerAdminRoleDescription,
        await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
      ],
      [roles.manager.address, airnodeTokenPayment.address]
    );

  // Set the default Price to 100
  await airnodeFeeRegistry.connect(roles.manager).setDefaultPrice(hre.ethers.utils.parseEther('100'));
});

describe('constructor', function () {
  context('AccessControlRegistry address is not zero', function () {
    context('admin role description string is not empty', function () {
      context('manager address is not zero', function () {
        context('AirnodeRequesterAuthorizerRegistry is not zero', function () {
          context('AirnodeFeeRegistry address is not zero', function () {
            context('payment token address is not zero', function () {
              it('constructs', async function () {
                const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory(
                  'AirnodeTokenPayment',
                  roles.deployer
                );
                airnodeTokenPayment = await airnodeTokenPaymentFactory.deploy(
                  accessControlRegistry.address,
                  airnodeTokenPaymentAdminRoleDescription,
                  roles.manager.address,
                  airnodeRequesterAuthorizerRegistry.address,
                  airnodeFeeRegistry.address,
                  api3Token.address
                );
                expect(await airnodeTokenPayment.accessControlRegistry()).to.equal(accessControlRegistry.address);
                expect(await airnodeTokenPayment.adminRoleDescription()).to.equal(
                  airnodeTokenPaymentAdminRoleDescription
                );
                expect(await airnodeTokenPayment.manager()).to.equal(roles.manager.address);
                expect(await airnodeTokenPayment.airnodeRequesterAuthorizerRegistry()).to.equal(
                  airnodeRequesterAuthorizerRegistry.address
                );
                expect(await airnodeTokenPayment.airnodeFeeRegistry()).to.equal(airnodeFeeRegistry.address);
                expect(await airnodeTokenPayment.paymentTokenAddress()).to.equal(api3Token.address);
              });
            });
            context('payment token address is zero', async function () {
              it('reverts', async function () {
                const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory(
                  'AirnodeTokenPayment',
                  roles.deployer
                );
                airnodeTokenPayment = await expect(
                  airnodeTokenPaymentFactory.deploy(
                    accessControlRegistry.address,
                    airnodeTokenPaymentAdminRoleDescription,
                    roles.manager.address,
                    airnodeRequesterAuthorizerRegistry.address,
                    airnodeFeeRegistry.address,
                    hre.ethers.constants.AddressZero
                  )
                ).to.be.revertedWith('Zero address');
              });
            });
          });
          context('AinodeFeeRegistry address is zero', function () {
            it('reverts', async function () {
              const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory(
                'AirnodeTokenPayment',
                roles.deployer
              );
              airnodeTokenPayment = await expect(
                airnodeTokenPaymentFactory.deploy(
                  accessControlRegistry.address,
                  airnodeTokenPaymentAdminRoleDescription,
                  roles.manager.address,
                  airnodeRequesterAuthorizerRegistry.address,
                  hre.ethers.constants.AddressZero,
                  api3Token.address
                )
              ).to.be.revertedWith('Zero address');
            });
          });
        });
        context('AirnodeRequesterAuthorizerRegistry is zero', function () {
          it('reverts', async function () {
            const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory(
              'AirnodeTokenPayment',
              roles.deployer
            );
            airnodeTokenPayment = await expect(
              airnodeTokenPaymentFactory.deploy(
                accessControlRegistry.address,
                airnodeTokenPaymentAdminRoleDescription,
                roles.manager.address,
                hre.ethers.constants.AddressZero,
                airnodeFeeRegistry.address,
                api3Token.address
              )
            ).to.be.revertedWith('Zero address');
          });
        });
      });
      context('manager address is zero', function () {
        it('reverts', async function () {
          const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory('AirnodeTokenPayment', roles.deployer);
          await expect(
            airnodeTokenPaymentFactory.deploy(
              accessControlRegistry.address,
              airnodeTokenPaymentAdminRoleDescription,
              hre.ethers.constants.AddressZero,
              airnodeRequesterAuthorizerRegistry.address,
              airnodeFeeRegistry.address,
              api3Token.address
            )
          ).to.be.revertedWith('Manager address zero');
        });
      });
    });
    context('admin role description string is empty', function () {
      it('reverts', async function () {
        const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory('AirnodeTokenPayment', roles.deployer);
        await expect(
          airnodeTokenPaymentFactory.deploy(
            accessControlRegistry.address,
            '',
            roles.manager.address,
            airnodeRequesterAuthorizerRegistry.address,
            airnodeFeeRegistry.address,
            api3Token.address
          )
        ).to.be.revertedWith('Admin role description empty');
      });
    });
  });
  context('AccessControlRegistry address is zero', function () {
    it('reverts', async function () {
      const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory('AirnodeTokenPayment', roles.deployer);
      await expect(
        airnodeTokenPaymentFactory.deploy(
          hre.ethers.constants.AddressZero,
          airnodeTokenPaymentAdminRoleDescription,
          roles.manager.address,
          airnodeRequesterAuthorizerRegistry.address,
          airnodeFeeRegistry.address,
          api3Token.address
        )
      ).to.be.revertedWith('ACR address zero');
    });
  });
});

describe('setPaymentTokenPrice', function () {
  context('caller has payment token price setter role (oracle)', function () {
    context('price is valid', function () {
      it('sets the payment token price', async function () {
        let paymentTokenPrice = await airnodeTokenPayment.paymentTokenPrice();
        expect(paymentTokenPrice).to.equal(hre.ethers.utils.parseEther('1').toString());
        await expect(
          airnodeTokenPayment
            .connect(roles.oracle)
            .setPaymentTokenPrice(hre.ethers.utils.parseUnits('7.5', 18).toString())
        )
          .to.emit(airnodeTokenPayment, 'SetPaymentTokenPrice')
          .withArgs(hre.ethers.utils.parseUnits('7.5', 18).toString(), roles.oracle.address);
        paymentTokenPrice = await airnodeTokenPayment.paymentTokenPrice();
        expect(paymentTokenPrice).to.equal(hre.ethers.utils.parseUnits('7.5', 18).toString());

        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(paymentTokenPriceSetterRole, roles.manager.address);

        await expect(
          airnodeTokenPayment
            .connect(roles.manager)
            .setPaymentTokenPrice(hre.ethers.utils.parseUnits('10', 18).toString())
        )
          .to.emit(airnodeTokenPayment, 'SetPaymentTokenPrice')
          .withArgs(hre.ethers.utils.parseUnits('10', 18).toString(), roles.manager.address);
        paymentTokenPrice = await airnodeTokenPayment.paymentTokenPrice();
        expect(paymentTokenPrice).to.equal(hre.ethers.utils.parseUnits('10', 18).toString());
      });
    });
    context('price is not valid', function () {
      it('reverts', async function () {
        await expect(airnodeTokenPayment.connect(roles.oracle).setPaymentTokenPrice(0)).to.be.revertedWith(
          'Invalid token price'
        );
      });
    });
  });
  context('caller does not have payment token price setter role (oracle)', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenPayment
          .connect(roles.randomPerson)
          .setPaymentTokenPrice(hre.ethers.utils.parseEther((1000).toString()))
      ).to.be.revertedWith('Not payment token price setter');
    });
  });
});

describe('setAirnodeToWhitelistDuration', function () {
  context('caller has Airnode to whitelist duration setter role', function () {
    context('duration period is valid', function () {
      it('sets the whitelist duration period for the airnode', async function () {
        const weekInSeconds = 7 * oneDayInSeconds;
        let whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal('0');
        expect(whitelistDuration.minimum.toString()).to.equal('0');
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(24 * thirtyDaysInSeconds, weekInSeconds)
        )
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(24 * thirtyDaysInSeconds, weekInSeconds, roles.airnode.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal((24 * thirtyDaysInSeconds).toString());
        expect(whitelistDuration.minimum.toString()).to.equal(weekInSeconds.toString());

        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(airnodeToMinimumWhitelistDurationSetterRole, roles.manager.address);
        await expect(
          airnodeTokenPayment
            .connect(roles.manager)
            .setAirnodeToWhitelistDuration(48 * thirtyDaysInSeconds, 2 * weekInSeconds)
        )
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(48 * thirtyDaysInSeconds, 2 * weekInSeconds, roles.manager.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.manager.address);
        expect(whitelistDuration.maximum.toString()).to.equal((48 * thirtyDaysInSeconds).toString());
        expect(whitelistDuration.minimum.toString()).to.equal((2 * weekInSeconds).toString());
      });
      it('sets the whitelist duration of a single period for the airnode', async function () {
        const tenDaysInSeconds = 10 * oneDayInSeconds;
        let whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal('0');
        expect(whitelistDuration.minimum.toString()).to.equal('0');
        await expect(
          airnodeTokenPayment.connect(roles.airnode).setAirnodeToWhitelistDuration(tenDaysInSeconds, tenDaysInSeconds)
        )
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(tenDaysInSeconds, tenDaysInSeconds, roles.airnode.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal(tenDaysInSeconds.toString());
        expect(whitelistDuration.minimum.toString()).to.equal(tenDaysInSeconds.toString());

        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(airnodeToMinimumWhitelistDurationSetterRole, roles.manager.address);

        const maximum = await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION();
        await expect(airnodeTokenPayment.connect(roles.manager).setAirnodeToWhitelistDuration(maximum, maximum))
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(maximum, maximum, roles.manager.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.manager.address);
        expect(whitelistDuration.maximum.toString()).to.equal(maximum.toString());
        expect(whitelistDuration.minimum.toString()).to.equal(maximum.toString());

        const minimum = await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION();
        await expect(airnodeTokenPayment.connect(roles.manager).setAirnodeToWhitelistDuration(minimum, minimum))
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(minimum, minimum, roles.manager.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.manager.address);
        expect(whitelistDuration.maximum.toString()).to.equal(minimum.toString());
        expect(whitelistDuration.minimum.toString()).to.equal(minimum.toString());
      });
      it('resets the whitelist duration period for the airnode', async function () {
        const weekInSeconds = 7 * oneDayInSeconds;
        let whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal('0');
        expect(whitelistDuration.minimum.toString()).to.equal('0');
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(24 * thirtyDaysInSeconds, weekInSeconds)
        )
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(24 * thirtyDaysInSeconds, weekInSeconds, roles.airnode.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal((24 * thirtyDaysInSeconds).toString());
        expect(whitelistDuration.minimum.toString()).to.equal(weekInSeconds.toString());

        await expect(airnodeTokenPayment.connect(roles.airnode).setAirnodeToWhitelistDuration(0, 0))
          .to.emit(airnodeTokenPayment, 'SetAirnodeToWhitelistDuration')
          .withArgs(0, 0, roles.airnode.address);
        whitelistDuration = await airnodeTokenPayment.airnodeToWhitelistDuration(roles.airnode.address);
        expect(whitelistDuration.maximum.toString()).to.equal('0');
        expect(whitelistDuration.minimum.toString()).to.equal('0');
      });
    });
    context('duration period is not valid', function () {
      it('reverts', async function () {
        // max is not greater or equal than min
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(
              await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION(),
              await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION()
            )
        ).to.be.revertedWith('Invalid duration');
        // max is less than default min
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(
              (await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION()).sub(1),
              await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION()
            )
        ).to.be.revertedWith('Invalid duration');
        // max is greater than default max
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(
              (await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION()).add(1),
              await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION()
            )
        ).to.be.revertedWith('Invalid duration');
        // min is less than default min
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(
              await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION(),
              (await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION()).sub(1)
            )
        ).to.be.revertedWith('Invalid duration');
        // min is greater than default max
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(
              await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION(),
              (await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION()).add(1)
            )
        ).to.be.revertedWith('Invalid duration');
        // max is 0
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(0, await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION())
        ).to.be.revertedWith('Invalid duration');
        // min is 0
        await expect(
          airnodeTokenPayment
            .connect(roles.airnode)
            .setAirnodeToWhitelistDuration(await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION(), 0)
        ).to.be.revertedWith('Invalid duration');
      });
    });
  });
  context('caller does not have Airnode to whitelist duration setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenPayment
          .connect(roles.randomPerson)
          .setAirnodeToWhitelistDuration(
            await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION(),
            await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION()
          )
      ).to.be.revertedWith('Not whitelist duration setter');
    });
  });
});

describe('setAirnodeToPaymentDestination', function () {
  context('caller has Airnode to payment destination setter role', function () {
    context('payment destination address is valid', function () {
      it('sets the payment destination address for the airnode', async function () {
        let paymentDestination = await airnodeTokenPayment.airnodeToPaymentDestination(roles.airnode.address);
        expect(paymentDestination).to.equal(hre.ethers.constants.AddressZero);
        await expect(airnodeTokenPayment.connect(roles.airnode).setAirnodeToPaymentDestination(roles.airnode.address))
          .to.emit(airnodeTokenPayment, 'SetAirnodeToPaymentDestination')
          .withArgs(roles.airnode.address, roles.airnode.address);
        paymentDestination = await airnodeTokenPayment.airnodeToPaymentDestination(roles.airnode.address);
        expect(paymentDestination).to.equal(roles.airnode.address);

        await accessControlRegistry
          .connect(roles.manager)
          .renounceRole(airnodeToPaymentDestinationSetterRole, roles.manager.address);
        await expect(
          airnodeTokenPayment.connect(roles.manager).setAirnodeToPaymentDestination(airnodePaymentDestination)
        )
          .to.emit(airnodeTokenPayment, 'SetAirnodeToPaymentDestination')
          .withArgs(airnodePaymentDestination, roles.manager.address);
        paymentDestination = await airnodeTokenPayment.airnodeToPaymentDestination(roles.manager.address);
        expect(paymentDestination).to.equal(airnodePaymentDestination);
      });
    });
    context('payment destination address is not valid', function () {
      it('reverts', async function () {
        await expect(
          airnodeTokenPayment.connect(roles.airnode).setAirnodeToPaymentDestination(hre.ethers.constants.AddressZero)
        ).to.be.revertedWith('Invalid destination address');
      });
    });
  });
  context('caller does not have Airnode to payment destination setter role', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenPayment.connect(roles.randomPerson).setAirnodeToPaymentDestination(roles.airnode.address)
      ).to.be.revertedWith('Not payment destination setter');
    });
  });
});

describe('makePayment', function () {
  context('chainId is valid', function () {
    context('Airnode address is valid', function () {
      context('requester address is valid', function () {
        context('whitelist duration is valid', function () {
          context('AirnodeRequesterAuthorizerRegistry has a RequesterAuthorizersWithManager set', function () {
            context('requester is not already whitelisted indefinitely', function () {
              context('payer has approved AirnodeTokenPayment to transfer tokens', function () {
                context('payer has tokens to transfer to AirnodeTokenPayment', function () {
                  it('makes the payment', async function () {
                    const payerBeforeBalance = await api3Token.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await api3Token.balanceOf(roles.airnode.address);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // payment for 30 days
                    const paymentAmountInWei = hre.ethers.utils.parseEther('100');

                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, paymentAmountInWei);

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPayment, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        roles.airnode.address,
                        paymentAmountInWei,
                        api3Token.address,
                        nextBlockTimestamp + thirtyDaysInSeconds
                      );

                    const payerAfterBalance = await api3Token.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInWei);
                    const airnodeAfterBalance = await api3Token.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance.sub(airnodeBeforeBalance)).to.equal(paymentAmountInWei);

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) + thirtyDaysInSeconds
                    );
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                  it('makes the payment where payment contract has 6 decimals', async function () {
                    const usdcTokenFactory = await hre.ethers.getContractFactory('MockUsdcToken', roles.deployer);
                    const usdcToken = await usdcTokenFactory.deploy(roles.deployer.address, roles.payer.address);
                    await usdcToken.deployed();

                    const airnodeTokenPaymentFactory = await hre.ethers.getContractFactory(
                      'AirnodeTokenPayment',
                      roles.deployer
                    );
                    const airnodeTokenPaymentUsdc = await airnodeTokenPaymentFactory.deploy(
                      accessControlRegistry.address,
                      airnodeTokenPaymentAdminRoleDescription,
                      roles.manager.address,
                      airnodeRequesterAuthorizerRegistry.address,
                      airnodeFeeRegistry.address,
                      usdcToken.address
                    );

                    const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);

                    const requesterAuthorizerWithManagerAdminRole = await requesterAuthorizerWithManager.adminRole();

                    adminRole = await airnodeTokenPaymentUsdc.adminRole();
                    paymentTokenPriceSetterRole = await airnodeTokenPaymentUsdc.paymentTokenPriceSetterRole();
                    airnodeToMinimumWhitelistDurationSetterRole =
                      await airnodeTokenPaymentUsdc.airnodeToWhitelistDurationSetterRole();
                    airnodeToPaymentDestinationSetterRole =
                      await airnodeTokenPaymentUsdc.airnodeToPaymentDestinationSetterRole();

                    // Grant roles to valid accounts
                    await accessControlRegistry.connect(roles.manager).initializeAndGrantRoles(
                      [managerRootRole, adminRole, adminRole, adminRole],
                      [
                        airnodeTokenPaymentAdminRoleDescription,
                        await airnodeTokenPaymentUsdc.PAYMENT_TOKEN_PRICE_SETTER_ROLE_DESCRIPTION(),
                        await airnodeTokenPaymentUsdc.AIRNODE_TO_WHITELIST_DURATION_SETTER_ROLE_DESCRIPTION(),
                        await airnodeTokenPaymentUsdc.AIRNODE_TO_PAYMENT_DESTINATION_SETTER_ROLE_DESCRIPTION(),
                      ],
                      [
                        roles.manager.address, // which will already have been granted the role
                        roles.oracle.address,
                        roles.airnode.address,
                        roles.airnode.address,
                      ]
                    );
                    // Grant `roles.randomPerson` some invalid roles
                    await accessControlRegistry
                      .connect(roles.manager)
                      .initializeAndGrantRoles(
                        [managerRootRole, managerRootRole, managerRootRole, managerRootRole],
                        [
                          Math.random(),
                          await airnodeTokenPaymentUsdc.PAYMENT_TOKEN_PRICE_SETTER_ROLE_DESCRIPTION(),
                          await airnodeTokenPaymentUsdc.AIRNODE_TO_WHITELIST_DURATION_SETTER_ROLE_DESCRIPTION(),
                          await airnodeTokenPaymentUsdc.AIRNODE_TO_PAYMENT_DESTINATION_SETTER_ROLE_DESCRIPTION(),
                        ],
                        [
                          roles.randomPerson.address,
                          roles.randomPerson.address,
                          roles.randomPerson.address,
                          roles.randomPerson.address,
                        ]
                      );
                    // Grant airnodeTokenPaymentUsdc contract the whitelist expiration extender role
                    await accessControlRegistry
                      .connect(roles.manager)
                      .initializeAndGrantRoles(
                        [managerRootRole, requesterAuthorizerWithManagerAdminRole],
                        [
                          requesterAuthorizerWithManagerAdminRoleDescription,
                          await requesterAuthorizerWithManager.WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION(),
                        ],
                        [roles.manager.address, airnodeTokenPaymentUsdc.address]
                      );

                    const payerBeforeBalance = await usdcToken.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await usdcToken.balanceOf(roles.airnode.address);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // payment for 45 days
                    const paymentAmountInSzabo = hre.ethers.utils.parseUnits('150', 6);

                    await usdcToken.connect(roles.payer).approve(airnodeTokenPaymentUsdc.address, paymentAmountInSzabo);

                    const fortyFiveDaysInSeconds = 45 * oneDayInSeconds;

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPaymentUsdc
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          fortyFiveDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPaymentUsdc, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        roles.airnode.address,
                        paymentAmountInSzabo,
                        usdcToken.address,
                        nextBlockTimestamp + fortyFiveDaysInSeconds
                      );

                    const payerAfterBalance = await usdcToken.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInSzabo);
                    const airnodeAfterBalance = await usdcToken.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance.sub(airnodeBeforeBalance)).to.equal(paymentAmountInSzabo);

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) + fortyFiveDaysInSeconds
                    );
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                  it('makes the payment with custom token price (7.25 USD)', async function () {
                    const payerBeforeBalance = await api3Token.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await api3Token.balanceOf(roles.airnode.address);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // sets the payment token price to 7.5 USD
                    const tokenPriceInWei = hre.ethers.utils.parseEther('7.25');
                    await airnodeTokenPayment.connect(roles.oracle).setPaymentTokenPrice(tokenPriceInWei);

                    // we are just dividing endpoint price over token price because
                    // the whitelisting duration  is equal to the endpoint price period
                    const paymentAmountInWei = hre.ethers.utils
                      .parseEther('100')
                      .mul(hre.ethers.BigNumber.from(10).pow(await api3Token.decimals()))
                      .div(tokenPriceInWei);

                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, paymentAmountInWei);

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPayment, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        roles.airnode.address,
                        paymentAmountInWei,
                        api3Token.address,
                        nextBlockTimestamp + thirtyDaysInSeconds
                      );

                    const payerAfterBalance = await api3Token.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInWei);
                    const airnodeAfterBalance = await api3Token.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance.sub(airnodeBeforeBalance)).to.equal(paymentAmountInWei);

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) + thirtyDaysInSeconds
                    );
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                  it('makes the payment with custom whitelist duration (max = 365 days and min = 15 days)', async function () {
                    const payerBeforeBalance = await api3Token.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await api3Token.balanceOf(roles.airnode.address);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    const oneYearInSeconds = 365 * oneDayInSeconds;
                    const fifteenDaysInSeconds = 15 * oneDayInSeconds;
                    await airnodeTokenPayment
                      .connect(roles.airnode)
                      .setAirnodeToWhitelistDuration(oneYearInSeconds, fifteenDaysInSeconds);

                    // payment for 30 days
                    const paymentAmountInWei = hre.ethers.utils.parseEther('100');

                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, paymentAmountInWei);

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPayment, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        roles.airnode.address,
                        paymentAmountInWei,
                        api3Token.address,
                        nextBlockTimestamp + thirtyDaysInSeconds
                      );

                    const payerAfterBalance = await api3Token.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInWei);
                    const airnodeAfterBalance = await api3Token.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance.sub(airnodeBeforeBalance)).to.equal(paymentAmountInWei);

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) + thirtyDaysInSeconds
                    );
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                  it('makes the payment to a different airnode payment address', async function () {
                    const payerBeforeBalance = await api3Token.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await api3Token.balanceOf(roles.airnode.address);
                    const airnodePaymentDestinationBeforeBalance = await api3Token.balanceOf(airnodePaymentDestination);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // sets payment destination to a different airnode address
                    await airnodeTokenPayment
                      .connect(roles.airnode)
                      .setAirnodeToPaymentDestination(airnodePaymentDestination);

                    // payment for 30 days
                    const paymentAmountInWei = hre.ethers.utils.parseEther('100');

                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, paymentAmountInWei);

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPayment, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        airnodePaymentDestination,
                        paymentAmountInWei,
                        api3Token.address,
                        nextBlockTimestamp + thirtyDaysInSeconds
                      );

                    const payerAfterBalance = await api3Token.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInWei);
                    const airnodeAfterBalance = await api3Token.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance).to.equal(airnodeBeforeBalance);
                    const airnodePaymentDestinationAfterBalance = await api3Token.balanceOf(airnodePaymentDestination);
                    expect(airnodePaymentDestinationAfterBalance.sub(airnodePaymentDestinationBeforeBalance)).to.equal(
                      paymentAmountInWei
                    );

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) + thirtyDaysInSeconds
                    );
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                  it('makes the payment and extends current whitelisting period', async function () {
                    const payerBeforeBalance = await api3Token.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await api3Token.balanceOf(roles.airnode.address);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // Whitelisted for 10 days
                    const tenDaysInSeconds = 10 * oneDayInSeconds;
                    const initialWhitelistExpiration =
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) + tenDaysInSeconds;
                    await requesterAuthorizerWithManager
                      .connect(roles.manager)
                      .setWhitelistExpiration(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        initialWhitelistExpiration
                      );
                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(initialWhitelistExpiration);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // payment for 30 days
                    const paymentAmountInWei = hre.ethers.utils.parseEther('100');

                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, paymentAmountInWei);

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPayment, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        roles.airnode.address,
                        paymentAmountInWei,
                        api3Token.address,
                        initialWhitelistExpiration + thirtyDaysInSeconds
                      );

                    const payerAfterBalance = await api3Token.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInWei);
                    const airnodeAfterBalance = await api3Token.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance.sub(airnodeBeforeBalance)).to.equal(paymentAmountInWei);

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(
                      initialWhitelistExpiration + thirtyDaysInSeconds
                    );
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                  it('makes the payment and ignores previous expired timestamp', async function () {
                    const payerBeforeBalance = await api3Token.balanceOf(roles.payer.address);
                    const airnodeBeforeBalance = await api3Token.balanceOf(roles.airnode.address);

                    let whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(0);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // Whitelist expired 10 days ago
                    const tenDaysInSeconds = 10 * oneDayInSeconds;
                    const initialWhitelistExpiration =
                      (await utils.getCurrentTimestamp(hre.ethers.provider)) - tenDaysInSeconds;
                    await requesterAuthorizerWithManager
                      .connect(roles.manager)
                      .setWhitelistExpiration(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        initialWhitelistExpiration
                      );
                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(initialWhitelistExpiration);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);

                    // payment for 30 days
                    const paymentAmountInWei = hre.ethers.utils.parseEther('100');

                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, paymentAmountInWei);

                    const lastBlockTimestamp = await utils.getCurrentTimestamp(hre.ethers.provider);
                    const nextBlockTimestamp = lastBlockTimestamp + 10;
                    await hre.ethers.provider.send('evm_setNextBlockTimestamp', [nextBlockTimestamp]);

                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    )
                      .to.emit(airnodeTokenPayment, 'MadePayment')
                      .withArgs(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        roles.payer.address,
                        roles.airnode.address,
                        paymentAmountInWei,
                        api3Token.address,
                        nextBlockTimestamp + thirtyDaysInSeconds
                      );

                    const payerAfterBalance = await api3Token.balanceOf(roles.payer.address);
                    expect(payerBeforeBalance.sub(payerAfterBalance)).to.equal(paymentAmountInWei);
                    const airnodeAfterBalance = await api3Token.balanceOf(roles.airnode.address);
                    expect(airnodeAfterBalance.sub(airnodeBeforeBalance)).to.equal(paymentAmountInWei);

                    whitelistStatus =
                      await requesterAuthorizerWithManager.airnodeToEndpointIdToRequesterToWhitelistStatus(
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address
                      );
                    expect(whitelistStatus.expirationTimestamp).to.equal(nextBlockTimestamp + thirtyDaysInSeconds);
                    expect(whitelistStatus.indefiniteWhitelistCount).to.equal(0);
                  });
                });
                context('payer does not have tokens to transfer to AirnodeTokenPayment', function () {
                  it('reverts', async function () {
                    const balance = await api3Token.balanceOf(roles.payer.address);
                    await api3Token.connect(roles.payer).approve(airnodeTokenPayment.address, balance);
                    await airnodeFeeRegistry
                      .connect(roles.manager)
                      .setChainAirnodeEndpointPrice(chainId, roles.airnode.address, endpointId, balance + 1);
                    await expect(
                      airnodeTokenPayment
                        .connect(roles.payer)
                        .makePayment(
                          chainId,
                          roles.airnode.address,
                          endpointId,
                          roles.requester.address,
                          thirtyDaysInSeconds
                        )
                    ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
                  });
                });
              });
              context('payer has not approved AirnodeTokenPayment to transfer tokens', function () {
                it('reverts', async function () {
                  await expect(
                    airnodeTokenPayment
                      .connect(roles.payer)
                      .makePayment(
                        chainId,
                        roles.airnode.address,
                        endpointId,
                        roles.requester.address,
                        thirtyDaysInSeconds
                      )
                  ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
                });
              });
            });
            context('requester is already whitelisted indefinitely', function () {
              it('reverts', async function () {
                await requesterAuthorizerWithManager
                  .connect(roles.manager)
                  .setIndefiniteWhitelistStatus(roles.airnode.address, endpointId, roles.requester.address, true);
                await expect(
                  airnodeTokenPayment
                    .connect(roles.payer)
                    .makePayment(
                      chainId,
                      roles.airnode.address,
                      endpointId,
                      roles.requester.address,
                      thirtyDaysInSeconds
                    )
                ).to.be.revertedWith('Already whitelisted indefinitely');
              });
            });
          });
          context(
            'AirnodeRequesterAuthorizerRegistry does not have a RequesterAuthorizersWithManager set',
            function () {
              it('reverts', async function () {
                await expect(
                  airnodeTokenPayment
                    .connect(roles.payer)
                    .makePayment(2, roles.airnode.address, endpointId, roles.requester.address, thirtyDaysInSeconds)
                ).to.be.revertedWith('No requester authorizer set');
              });
            }
          );
        });
        context('whitelist duration is invalid', function () {
          it('reverts', async function () {
            await expect(
              airnodeTokenPayment
                .connect(roles.payer)
                .makePayment(chainId, roles.airnode.address, endpointId, roles.requester.address, 0)
            ).to.be.revertedWith('Invalid whitelist duration');
            await expect(
              airnodeTokenPayment
                .connect(roles.payer)
                .makePayment(
                  chainId,
                  roles.airnode.address,
                  endpointId,
                  roles.requester.address,
                  (await airnodeTokenPayment.DEFAULT_MAXIMUM_WHITELIST_DURATION()).add(1)
                )
            ).to.be.revertedWith('Invalid whitelist duration');
            await expect(
              airnodeTokenPayment
                .connect(roles.payer)
                .makePayment(
                  chainId,
                  roles.airnode.address,
                  endpointId,
                  roles.requester.address,
                  (await airnodeTokenPayment.DEFAULT_MINIMUM_WHITELIST_DURATION()).sub(1)
                )
            ).to.be.revertedWith('Invalid whitelist duration');
            // Custom Airnode maximum is set to 365 days and minimum is set to 30 days in seconds
            const oneYearInSeconds = 365 * oneDayInSeconds;
            await airnodeTokenPayment
              .connect(roles.airnode)
              .setAirnodeToWhitelistDuration(oneYearInSeconds, thirtyDaysInSeconds);
            await expect(
              airnodeTokenPayment
                .connect(roles.payer)
                .makePayment(chainId, roles.airnode.address, endpointId, roles.requester.address, oneYearInSeconds + 1)
            ).to.be.revertedWith('Invalid whitelist duration');
            await expect(
              airnodeTokenPayment
                .connect(roles.payer)
                .makePayment(
                  chainId,
                  roles.airnode.address,
                  endpointId,
                  roles.requester.address,
                  thirtyDaysInSeconds - 1
                )
            ).to.be.revertedWith('Invalid whitelist duration');
          });
        });
      });
      context('requester address is invalid', function () {
        it('reverts', async function () {
          await expect(
            airnodeTokenPayment
              .connect(roles.payer)
              .makePayment(
                chainId,
                roles.airnode.address,
                endpointId,
                hre.ethers.constants.AddressZero,
                thirtyDaysInSeconds
              )
          ).to.be.revertedWith('Invalid requester address');
        });
      });
    });
    context('Airnode address is valid', function () {
      it('reverts', async function () {
        await expect(
          airnodeTokenPayment
            .connect(roles.payer)
            .makePayment(
              chainId,
              hre.ethers.constants.AddressZero,
              endpointId,
              roles.requester.address,
              thirtyDaysInSeconds
            )
        ).to.be.revertedWith('Invalid Airnode address');
      });
    });
  });
  context('chainId is invalid', function () {
    it('reverts', async function () {
      await expect(
        airnodeTokenPayment
          .connect(roles.payer)
          .makePayment(0, roles.airnode.address, endpointId, roles.requester.address, thirtyDaysInSeconds)
      ).to.be.revertedWith('Invalid chainId');
    });
  });
});
