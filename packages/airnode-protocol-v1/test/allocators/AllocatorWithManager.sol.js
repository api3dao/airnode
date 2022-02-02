/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, allocatorWithManager;
let allocatorWithManagerAdminRoleDescription = 'AllocatorWithManager admin role';
let slotSetterRoleDescription = 'Slot setter';
let slotSetterRole;
let slotIndex = Math.floor(Math.random() * 1000);
let subscriptionId, anotherSubscriptionId;
let expirationTimestamp;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    manager: accounts[1],
    airnode: accounts[2],
    slotSetter: accounts[3],
    anotherSlotSetter: accounts[4],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const allocatorWithManagerFactory = await hre.ethers.getContractFactory('AllocatorWithManager', roles.deployer);
  allocatorWithManager = await allocatorWithManagerFactory.deploy(
    accessControlRegistry.address,
    allocatorWithManagerAdminRoleDescription,
    roles.manager.address
  );
  const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
  const managerAdminRole = await allocatorWithManager.adminRole();
  slotSetterRole = await allocatorWithManager.slotSetterRole();
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerRootRole, allocatorWithManagerAdminRoleDescription);
  await accessControlRegistry
    .connect(roles.manager)
    .initializeRoleAndGrantToSender(managerAdminRole, slotSetterRoleDescription);
  await accessControlRegistry.connect(roles.manager).grantRole(slotSetterRole, roles.slotSetter.address);
  await accessControlRegistry.connect(roles.manager).grantRole(slotSetterRole, roles.anotherSlotSetter.address);
  expirationTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 3600;
  subscriptionId = testUtils.generateRandomBytes32();
  anotherSubscriptionId = testUtils.generateRandomBytes32();
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await allocatorWithManager.SLOT_SETTER_ROLE_DESCRIPTION()).to.equal(slotSetterRoleDescription);
    const managerRootRole = await accessControlRegistry.deriveRootRole(roles.manager.address);
    const adminRoleDescriptionHash = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['string'], [allocatorWithManagerAdminRoleDescription])
    );
    const adminRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes32'], [managerRootRole, adminRoleDescriptionHash])
    );
    const slotSetterRoleDescriptionHash = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['string'], [slotSetterRoleDescription])
    );
    const derivedSlotSetterRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes32'], [adminRole, slotSetterRoleDescriptionHash])
    );
    expect(await allocatorWithManager.slotSetterRole()).to.equal(derivedSlotSetterRole);
  });
});

describe('setSlot', function () {
  context('Sender has slot setter role', function () {
    context('Expiration is not in the past', function () {
      context('Slot has not been set before', function () {
        it('sets slot', async function () {
          const slotBefore = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slotBefore.subscriptionId).to.equal(hre.ethers.constants.HashZero);
          expect(slotBefore.setter).to.equal(hre.ethers.constants.AddressZero);
          expect(slotBefore.expirationTimestamp).to.equal(0);
          await expect(
            allocatorWithManager
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
          )
            .to.emit(allocatorWithManager, 'SetSlot')
            .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
          const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slot.subscriptionId).to.equal(subscriptionId);
          expect(slot.setter).to.equal(roles.slotSetter.address);
          expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
        });
      });
      context('Slot has been set before', function () {
        context('Previous slot setter is the sender', function () {
          it('sets slot', async function () {
            await allocatorWithManager
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
            await expect(
              allocatorWithManager
                .connect(roles.slotSetter)
                .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
            )
              .to.emit(allocatorWithManager, 'SetSlot')
              .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
            const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
            expect(slot.subscriptionId).to.equal(subscriptionId);
            expect(slot.setter).to.equal(roles.slotSetter.address);
            expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
          });
        });
        context('Previous slot setter is not the sender', function () {
          context('Previous slot has expired', function () {
            it('sets slot', async function () {
              const currentTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
              const firstSlotSetExpiresAt = currentTimestamp + 60;
              const secondSlotIsSetAt = firstSlotSetExpiresAt + 60;
              await allocatorWithManager
                .connect(roles.anotherSlotSetter)
                .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, firstSlotSetExpiresAt);
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [secondSlotIsSetAt]);
              await expect(
                allocatorWithManager
                  .connect(roles.slotSetter)
                  .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
              )
                .to.emit(allocatorWithManager, 'SetSlot')
                .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
              const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
              expect(slot.subscriptionId).to.equal(subscriptionId);
              expect(slot.setter).to.equal(roles.slotSetter.address);
              expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
            });
          });
          context('Previous slot has not expired', function () {
            context('Previous slot setter can no longer set slots', function () {
              it('sets slot', async function () {
                await allocatorWithManager
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
                await accessControlRegistry
                  .connect(roles.manager)
                  .revokeRole(slotSetterRole, roles.anotherSlotSetter.address);
                await expect(
                  allocatorWithManager
                    .connect(roles.slotSetter)
                    .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
                )
                  .to.emit(allocatorWithManager, 'SetSlot')
                  .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
                const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
                expect(slot.subscriptionId).to.equal(subscriptionId);
                expect(slot.setter).to.equal(roles.slotSetter.address);
                expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
              });
            });
            context('Previous slot setter can still set slots', function () {
              it('reverts', async function () {
                await allocatorWithManager
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
                await expect(
                  allocatorWithManager
                    .connect(roles.slotSetter)
                    .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
                ).to.be.revertedWith('Cannot reset slot');
              });
            });
          });
        });
      });
    });
    context('Expiration is in the past', function () {
      it('reverts', async function () {
        await expect(
          allocatorWithManager.connect(roles.slotSetter).setSlot(roles.airnode.address, slotIndex, subscriptionId, 0)
        ).to.be.revertedWith('Expiration is in past');
      });
    });
  });
  context('Sender is the manager address', function () {
    context('Expiration is not in the past', function () {
      context('Slot has not been set before', function () {
        it('sets slot', async function () {
          const slotBefore = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slotBefore.subscriptionId).to.equal(hre.ethers.constants.HashZero);
          expect(slotBefore.setter).to.equal(hre.ethers.constants.AddressZero);
          expect(slotBefore.expirationTimestamp).to.equal(0);
          await expect(
            allocatorWithManager
              .connect(roles.manager)
              .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
          )
            .to.emit(allocatorWithManager, 'SetSlot')
            .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
          const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slot.subscriptionId).to.equal(subscriptionId);
          expect(slot.setter).to.equal(roles.manager.address);
          expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
        });
      });
      context('Slot has been set before', function () {
        context('Previous slot setter is the sender', function () {
          it('sets slot', async function () {
            await allocatorWithManager
              .connect(roles.manager)
              .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
            await expect(
              allocatorWithManager
                .connect(roles.manager)
                .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
            )
              .to.emit(allocatorWithManager, 'SetSlot')
              .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
            const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
            expect(slot.subscriptionId).to.equal(subscriptionId);
            expect(slot.setter).to.equal(roles.manager.address);
            expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
          });
        });
        context('Previous slot setter is not the sender', function () {
          context('Previous slot has expired', function () {
            it('sets slot', async function () {
              const currentTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
              const firstSlotSetExpiresAt = currentTimestamp + 60;
              const secondSlotIsSetAt = firstSlotSetExpiresAt + 60;
              await allocatorWithManager
                .connect(roles.anotherSlotSetter)
                .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, firstSlotSetExpiresAt);
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [secondSlotIsSetAt]);
              await expect(
                allocatorWithManager
                  .connect(roles.manager)
                  .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
              )
                .to.emit(allocatorWithManager, 'SetSlot')
                .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
              const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
              expect(slot.subscriptionId).to.equal(subscriptionId);
              expect(slot.setter).to.equal(roles.manager.address);
              expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
            });
          });
          context('Previous slot has not expired', function () {
            context('Previous slot setter can no longer set slots', function () {
              it('sets slot', async function () {
                await allocatorWithManager
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
                await accessControlRegistry
                  .connect(roles.manager)
                  .revokeRole(slotSetterRole, roles.anotherSlotSetter.address);
                await expect(
                  allocatorWithManager
                    .connect(roles.manager)
                    .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
                )
                  .to.emit(allocatorWithManager, 'SetSlot')
                  .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
                const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
                expect(slot.subscriptionId).to.equal(subscriptionId);
                expect(slot.setter).to.equal(roles.manager.address);
                expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
              });
            });
            context('Previous slot setter can still set slots', function () {
              it('reverts', async function () {
                await allocatorWithManager
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
                await expect(
                  allocatorWithManager
                    .connect(roles.manager)
                    .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
                ).to.be.revertedWith('Cannot reset slot');
              });
            });
          });
        });
      });
    });
    context('Expiration is in the past', function () {
      it('reverts', async function () {
        await expect(
          allocatorWithManager.connect(roles.manager).setSlot(roles.airnode.address, slotIndex, subscriptionId, 0)
        ).to.be.revertedWith('Expiration is in past');
      });
    });
  });
  context('Sender does not have the slot setter role and is not the manager address', function () {
    it('reverts', async function () {
      await expect(
        allocatorWithManager
          .connect(roles.randomPerson)
          .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
      ).to.be.revertedWith('Sender cannot set slot');
    });
  });
});

describe('resetSlot', function () {
  context('Slot has been set before', function () {
    context('Previous slot setter is the sender', function () {
      it('resets slot', async function () {
        await allocatorWithManager
          .connect(roles.slotSetter)
          .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
        await expect(allocatorWithManager.connect(roles.slotSetter).resetSlot(roles.airnode.address, slotIndex))
          .to.emit(allocatorWithManager, 'ResetSlot')
          .withArgs(roles.airnode.address, slotIndex);
        const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
        expect(slot.subscriptionId).to.equal(hre.ethers.constants.HashZero);
        expect(slot.setter).to.equal(hre.ethers.constants.AddressZero);
        expect(slot.expirationTimestamp).to.equal(0);
      });
    });
    context('Previous slot setter is not the sender', function () {
      context('Previous slot has expired', function () {
        it('sets slot', async function () {
          const currentTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
          const firstSlotSetExpiresAt = currentTimestamp + 60;
          const slotResetAt = firstSlotSetExpiresAt + 60;
          await allocatorWithManager
            .connect(roles.slotSetter)
            .setSlot(roles.airnode.address, slotIndex, subscriptionId, firstSlotSetExpiresAt);
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [slotResetAt]);
          await expect(allocatorWithManager.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex))
            .to.emit(allocatorWithManager, 'ResetSlot')
            .withArgs(roles.airnode.address, slotIndex);
          const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slot.subscriptionId).to.equal(hre.ethers.constants.HashZero);
          expect(slot.setter).to.equal(hre.ethers.constants.AddressZero);
          expect(slot.expirationTimestamp).to.equal(0);
        });
      });
      context('Previous slot has not expired', function () {
        context('Previous slot setter can no longer set slots', function () {
          it('resets slot', async function () {
            await allocatorWithManager
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
            await accessControlRegistry.connect(roles.manager).revokeRole(slotSetterRole, roles.slotSetter.address);
            await expect(allocatorWithManager.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex))
              .to.emit(allocatorWithManager, 'ResetSlot')
              .withArgs(roles.airnode.address, slotIndex);
            const slot = await allocatorWithManager.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
            expect(slot.subscriptionId).to.equal(hre.ethers.constants.HashZero);
            expect(slot.setter).to.equal(hre.ethers.constants.AddressZero);
            expect(slot.expirationTimestamp).to.equal(0);
          });
        });
        context('Previous slot setter can still set slots', function () {
          it('reverts', async function () {
            await allocatorWithManager
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, anotherSubscriptionId, expirationTimestamp);
            await expect(
              allocatorWithManager.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex)
            ).to.be.revertedWith('Cannot reset slot');
          });
        });
      });
    });
  });
  context('Slot has not been set before', function () {
    it('does nothing', async function () {
      await expect(
        allocatorWithManager.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex)
      ).to.not.emit(allocatorWithManager, 'ResetSlot');
    });
  });
});

describe('setterOfSlotIsCanStillSet', function () {
  context('Setter of slot is still a slot setter', function () {
    it('returns true', async function () {
      await allocatorWithManager
        .connect(roles.slotSetter)
        .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
      expect(await allocatorWithManager.setterOfSlotIsCanStillSet(roles.airnode.address, slotIndex)).to.equal(true);
    });
  });
  context('Setter of slot is the manager address', function () {
    it('returns true', async function () {
      await allocatorWithManager
        .connect(roles.manager)
        .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
      expect(await allocatorWithManager.setterOfSlotIsCanStillSet(roles.airnode.address, slotIndex)).to.equal(true);
    });
  });
  context('Setter of slot is no longer authorized', function () {
    it('returns false', async function () {
      await allocatorWithManager
        .connect(roles.slotSetter)
        .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
      await accessControlRegistry.connect(roles.manager).revokeRole(slotSetterRole, roles.slotSetter.address);
      expect(await allocatorWithManager.setterOfSlotIsCanStillSet(roles.airnode.address, slotIndex)).to.equal(false);
    });
  });
});

describe('hasSlotSetterRoleOrIsManager', function () {
  context('Has slot setter role', function () {
    it('returns true', async function () {
      expect(await allocatorWithManager.hasSlotSetterRoleOrIsManager(roles.slotSetter.address)).to.equal(true);
    });
  });
  context('Is the manager address', function () {
    it('returns true', async function () {
      expect(await allocatorWithManager.hasSlotSetterRoleOrIsManager(roles.manager.address)).to.equal(true);
    });
  });
  context('Does not have the slot setter role or is the manager address', function () {
    it('returns false', async function () {
      expect(await allocatorWithManager.hasSlotSetterRoleOrIsManager(roles.randomPerson.address)).to.equal(false);
    });
  });
});
