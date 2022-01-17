/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');
const testUtils = require('../test-utils');

let roles;
let accessControlRegistry, allocatorWithAirnode;
let allocatorWithAirnodeAdminRoleDescription = 'AllocatorWithAirnode admin role';
let slotSetterRoleDescription = 'Slot setter';
let airnodeSlotSetterRole;
let slotIndex = Math.floor(Math.random() * 1000);
let subscriptionId = testUtils.generateRandomBytes32();
let expirationTimestamp;

beforeEach(async () => {
  const accounts = await hre.ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnode: accounts[1],
    slotSetter: accounts[2],
    anotherSlotSetter: accounts[3],
    randomPerson: accounts[9],
  };
  const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
  accessControlRegistry = await accessControlRegistryFactory.deploy();
  const allocatorWithAirnodeFactory = await hre.ethers.getContractFactory('AllocatorWithAirnode', roles.deployer);
  allocatorWithAirnode = await allocatorWithAirnodeFactory.deploy(
    accessControlRegistry.address,
    allocatorWithAirnodeAdminRoleDescription
  );
  const airnodeRootRole = await accessControlRegistry.deriveRootRole(roles.airnode.address);
  const airnodeAdminRole = await allocatorWithAirnode.deriveAdminRole(roles.airnode.address);
  airnodeSlotSetterRole = await allocatorWithAirnode.deriveSlotSetterRole(roles.airnode.address);
  await accessControlRegistry
    .connect(roles.airnode)
    .initializeRoleAndGrantToSender(airnodeRootRole, allocatorWithAirnodeAdminRoleDescription);
  await accessControlRegistry
    .connect(roles.airnode)
    .initializeRoleAndGrantToSender(airnodeAdminRole, slotSetterRoleDescription);
  await accessControlRegistry.connect(roles.airnode).grantRole(airnodeSlotSetterRole, roles.slotSetter.address);
  await accessControlRegistry.connect(roles.airnode).grantRole(airnodeSlotSetterRole, roles.anotherSlotSetter.address);
  expirationTimestamp = (await testUtils.getCurrentTimestamp(hre.ethers.provider)) + 3600;
});

describe('constructor', function () {
  it('constructs', async function () {
    expect(await allocatorWithAirnode.SLOT_SETTER_ROLE_DESCRIPTION()).to.equal(slotSetterRoleDescription);
  });
});

describe('setSlot', function () {
  context('Sender has slot setter role', function () {
    context('Expiration is not in the past', function () {
      context('Slot has not been set before', function () {
        it('sets slot', async function () {
          const slotBefore = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slotBefore.subscriptionId).to.equal(hre.ethers.constants.HashZero);
          expect(slotBefore.setter).to.equal(hre.ethers.constants.AddressZero);
          expect(slotBefore.expirationTimestamp).to.equal(0);
          await expect(
            allocatorWithAirnode
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
          )
            .to.emit(allocatorWithAirnode, 'SetSlot')
            .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
          const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slot.subscriptionId).to.equal(subscriptionId);
          expect(slot.setter).to.equal(roles.slotSetter.address);
          expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
        });
      });
      context('Slot has been set before', function () {
        context('Previous slot setter is the sender', function () {
          it('sets slot', async function () {
            await allocatorWithAirnode
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
            await expect(
              allocatorWithAirnode
                .connect(roles.slotSetter)
                .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
            )
              .to.emit(allocatorWithAirnode, 'SetSlot')
              .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
            const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
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
              await allocatorWithAirnode
                .connect(roles.anotherSlotSetter)
                .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), firstSlotSetExpiresAt);
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [secondSlotIsSetAt]);
              await expect(
                allocatorWithAirnode
                  .connect(roles.slotSetter)
                  .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
              )
                .to.emit(allocatorWithAirnode, 'SetSlot')
                .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
              const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
              expect(slot.subscriptionId).to.equal(subscriptionId);
              expect(slot.setter).to.equal(roles.slotSetter.address);
              expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
            });
          });
          context('Previous slot has not expired', function () {
            context('Previous slot setter can no longer set slots', function () {
              it('sets slot', async function () {
                await allocatorWithAirnode
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
                await accessControlRegistry
                  .connect(roles.airnode)
                  .revokeRole(airnodeSlotSetterRole, roles.anotherSlotSetter.address);
                await expect(
                  allocatorWithAirnode
                    .connect(roles.slotSetter)
                    .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
                )
                  .to.emit(allocatorWithAirnode, 'SetSlot')
                  .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
                const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
                expect(slot.subscriptionId).to.equal(subscriptionId);
                expect(slot.setter).to.equal(roles.slotSetter.address);
                expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
              });
            });
            context('Previous slot setter can still set slots', function () {
              it('reverts', async function () {
                await allocatorWithAirnode
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
                await expect(
                  allocatorWithAirnode
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
          allocatorWithAirnode.connect(roles.slotSetter).setSlot(roles.airnode.address, slotIndex, subscriptionId, 0)
        ).to.be.revertedWith('Expiration is in past');
      });
    });
  });
  context('Sender is the Airnode address', function () {
    context('Expiration is not in the past', function () {
      context('Slot has not been set before', function () {
        it('sets slot', async function () {
          const slotBefore = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slotBefore.subscriptionId).to.equal(hre.ethers.constants.HashZero);
          expect(slotBefore.setter).to.equal(hre.ethers.constants.AddressZero);
          expect(slotBefore.expirationTimestamp).to.equal(0);
          await expect(
            allocatorWithAirnode
              .connect(roles.airnode)
              .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
          )
            .to.emit(allocatorWithAirnode, 'SetSlot')
            .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
          const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slot.subscriptionId).to.equal(subscriptionId);
          expect(slot.setter).to.equal(roles.airnode.address);
          expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
        });
      });
      context('Slot has been set before', function () {
        context('Previous slot setter is the sender', function () {
          it('sets slot', async function () {
            await allocatorWithAirnode
              .connect(roles.airnode)
              .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
            await expect(
              allocatorWithAirnode
                .connect(roles.airnode)
                .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
            )
              .to.emit(allocatorWithAirnode, 'SetSlot')
              .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
            const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
            expect(slot.subscriptionId).to.equal(subscriptionId);
            expect(slot.setter).to.equal(roles.airnode.address);
            expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
          });
        });
        context('Previous slot setter is not the sender', function () {
          context('Previous slot has expired', function () {
            it('sets slot', async function () {
              const currentTimestamp = await testUtils.getCurrentTimestamp(hre.ethers.provider);
              const firstSlotSetExpiresAt = currentTimestamp + 60;
              const secondSlotIsSetAt = firstSlotSetExpiresAt + 60;
              await allocatorWithAirnode
                .connect(roles.anotherSlotSetter)
                .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), firstSlotSetExpiresAt);
              await hre.ethers.provider.send('evm_setNextBlockTimestamp', [secondSlotIsSetAt]);
              await expect(
                allocatorWithAirnode
                  .connect(roles.airnode)
                  .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
              )
                .to.emit(allocatorWithAirnode, 'SetSlot')
                .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
              const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
              expect(slot.subscriptionId).to.equal(subscriptionId);
              expect(slot.setter).to.equal(roles.airnode.address);
              expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
            });
          });
          context('Previous slot has not expired', function () {
            context('Previous slot setter can no longer set slots', function () {
              it('sets slot', async function () {
                await allocatorWithAirnode
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
                await accessControlRegistry
                  .connect(roles.airnode)
                  .revokeRole(airnodeSlotSetterRole, roles.anotherSlotSetter.address);
                await expect(
                  allocatorWithAirnode
                    .connect(roles.airnode)
                    .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp)
                )
                  .to.emit(allocatorWithAirnode, 'SetSlot')
                  .withArgs(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
                const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
                expect(slot.subscriptionId).to.equal(subscriptionId);
                expect(slot.setter).to.equal(roles.airnode.address);
                expect(slot.expirationTimestamp).to.equal(expirationTimestamp);
              });
            });
            context('Previous slot setter can still set slots', function () {
              it('reverts', async function () {
                await allocatorWithAirnode
                  .connect(roles.anotherSlotSetter)
                  .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
                await expect(
                  allocatorWithAirnode
                    .connect(roles.airnode)
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
          allocatorWithAirnode.connect(roles.airnode).setSlot(roles.airnode.address, slotIndex, subscriptionId, 0)
        ).to.be.revertedWith('Expiration is in past');
      });
    });
  });
  context('Sender does not have the slot setter role and is not the Airnode address', function () {
    it('reverts', async function () {
      await expect(
        allocatorWithAirnode
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
        await allocatorWithAirnode
          .connect(roles.slotSetter)
          .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
        await expect(allocatorWithAirnode.connect(roles.slotSetter).resetSlot(roles.airnode.address, slotIndex))
          .to.emit(allocatorWithAirnode, 'ResetSlot')
          .withArgs(roles.airnode.address, slotIndex);
        const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
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
          await allocatorWithAirnode
            .connect(roles.slotSetter)
            .setSlot(roles.airnode.address, slotIndex, subscriptionId, firstSlotSetExpiresAt);
          await hre.ethers.provider.send('evm_setNextBlockTimestamp', [slotResetAt]);
          await expect(allocatorWithAirnode.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex))
            .to.emit(allocatorWithAirnode, 'ResetSlot')
            .withArgs(roles.airnode.address, slotIndex);
          const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
          expect(slot.subscriptionId).to.equal(hre.ethers.constants.HashZero);
          expect(slot.setter).to.equal(hre.ethers.constants.AddressZero);
          expect(slot.expirationTimestamp).to.equal(0);
        });
      });
      context('Previous slot has not expired', function () {
        context('Previous slot setter can no longer set slots', function () {
          it('resets slot', async function () {
            await allocatorWithAirnode
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
            await accessControlRegistry
              .connect(roles.airnode)
              .revokeRole(airnodeSlotSetterRole, roles.slotSetter.address);
            await expect(allocatorWithAirnode.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex))
              .to.emit(allocatorWithAirnode, 'ResetSlot')
              .withArgs(roles.airnode.address, slotIndex);
            const slot = await allocatorWithAirnode.airnodeToSlotIndexToSlot(roles.airnode.address, slotIndex);
            expect(slot.subscriptionId).to.equal(hre.ethers.constants.HashZero);
            expect(slot.setter).to.equal(hre.ethers.constants.AddressZero);
            expect(slot.expirationTimestamp).to.equal(0);
          });
        });
        context('Previous slot setter can still set slots', function () {
          it('reverts', async function () {
            await allocatorWithAirnode
              .connect(roles.slotSetter)
              .setSlot(roles.airnode.address, slotIndex, testUtils.generateRandomBytes32(), expirationTimestamp);
            await expect(
              allocatorWithAirnode.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex)
            ).to.be.revertedWith('Cannot reset slot');
          });
        });
      });
    });
  });
  context('Slot has not been set before', function () {
    it('does nothing', async function () {
      await expect(
        allocatorWithAirnode.connect(roles.randomPerson).resetSlot(roles.airnode.address, slotIndex)
      ).to.not.emit(allocatorWithAirnode, 'ResetSlot');
    });
  });
});

describe('setterOfSlotIsStillAuthorized', function () {
  context('Setter of slot is still a slot setter', function () {
    it('returns true', async function () {
      await allocatorWithAirnode
        .connect(roles.slotSetter)
        .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
      expect(await allocatorWithAirnode.setterOfSlotIsStillAuthorized(roles.airnode.address, slotIndex)).to.equal(true);
    });
  });
  context('Setter of slot is the Airnode address', function () {
    it('returns true', async function () {
      await allocatorWithAirnode
        .connect(roles.airnode)
        .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
      expect(await allocatorWithAirnode.setterOfSlotIsStillAuthorized(roles.airnode.address, slotIndex)).to.equal(true);
    });
  });
  context('Setter of slot is no longer authorized', function () {
    it('returns false', async function () {
      await allocatorWithAirnode
        .connect(roles.slotSetter)
        .setSlot(roles.airnode.address, slotIndex, subscriptionId, expirationTimestamp);
      await accessControlRegistry.connect(roles.airnode).revokeRole(airnodeSlotSetterRole, roles.slotSetter.address);
      expect(await allocatorWithAirnode.setterOfSlotIsStillAuthorized(roles.airnode.address, slotIndex)).to.equal(
        false
      );
    });
  });
});

describe('hasSlotSetterRoleOrIsAirnode', function () {
  context('Has slot setter role', function () {
    it('returns true', async function () {
      expect(
        await allocatorWithAirnode.hasSlotSetterRoleOrIsAirnode(roles.airnode.address, roles.slotSetter.address)
      ).to.equal(true);
    });
  });
  context('Is the Airnode address', function () {
    it('returns true', async function () {
      expect(
        await allocatorWithAirnode.hasSlotSetterRoleOrIsAirnode(roles.airnode.address, roles.airnode.address)
      ).to.equal(true);
    });
  });
  context('Does not have the slot setter role or is the Airnode address', function () {
    it('returns false', async function () {
      expect(
        await allocatorWithAirnode.hasSlotSetterRoleOrIsAirnode(roles.airnode.address, roles.randomPerson.address)
      ).to.equal(false);
    });
  });
});

describe('deriveAdminRole', function () {
  it('derives admin role', async function () {
    const airnodeRootRole = await accessControlRegistry.deriveRootRole(roles.airnode.address);
    const adminRoleDescriptionHash = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['string'], [allocatorWithAirnodeAdminRoleDescription])
    );
    const airnodeAdminRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes32'], [airnodeRootRole, adminRoleDescriptionHash])
    );
    expect(await allocatorWithAirnode.deriveAdminRole(roles.airnode.address)).to.equal(airnodeAdminRole);
  });
});

describe('deriveSlotSetterRole', function () {
  it('derives slot setter role', async function () {
    const airnodeRootRole = await accessControlRegistry.deriveRootRole(roles.airnode.address);
    const adminRoleDescriptionHash = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['string'], [allocatorWithAirnodeAdminRoleDescription])
    );
    const airnodeAdminRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes32'], [airnodeRootRole, adminRoleDescriptionHash])
    );
    const slotSetterRoleDescriptionHash = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['string'], [slotSetterRoleDescription])
    );
    const airnodeSlotSetterRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['bytes32', 'bytes32'], [airnodeAdminRole, slotSetterRoleDescriptionHash])
    );
    expect(await allocatorWithAirnode.deriveSlotSetterRole(roles.airnode.address)).to.equal(airnodeSlotSetterRole);
  });
});
