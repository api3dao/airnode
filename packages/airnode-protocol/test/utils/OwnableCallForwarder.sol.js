const hre = require('hardhat');
const { expect } = require('chai');

describe('OwnableCallForwarder', function () {
  let roles;
  let accessControlRegistry, mockCallForwarderTarget, ownableCallForwarder;
  let managerRootRole, roleDescription;

  beforeEach(async () => {
    const accounts = await hre.ethers.getSigners();
    roles = {
      deployer: accounts[0],
      forwarderOwner: accounts[1],
      account: accounts[2],
      randomPerson: accounts[9],
    };
    const accessControlRegistryFactory = await hre.ethers.getContractFactory('AccessControlRegistry', roles.deployer);
    accessControlRegistry = await accessControlRegistryFactory.deploy();
    const mockCallForwarderTargetFactory = await hre.ethers.getContractFactory(
      'MockCallForwarderTarget',
      roles.deployer
    );
    mockCallForwarderTarget = await mockCallForwarderTargetFactory.deploy();
    const ownableCallForwarderFactory = await hre.ethers.getContractFactory('OwnableCallForwarder', roles.deployer);
    ownableCallForwarder = await ownableCallForwarderFactory.deploy();
    await ownableCallForwarder.transferOwnership(roles.forwarderOwner.address);
    managerRootRole = hre.ethers.utils.keccak256(
      hre.ethers.utils.solidityPack(['address'], [ownableCallForwarder.address])
    );
    roleDescription = 'Role description unique to adminRole';
  });

  describe('initializeRoleAndGrantToSender', function () {
    describe('Sender is forwarder owner', function () {
      it('initializesRole', async function () {
        const calldata = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          roleDescription,
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        await expect(
          ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata)
        )
          .to.emit(accessControlRegistry, 'InitializedRole')
          .withArgs(role, managerRootRole, roleDescription, ownableCallForwarder.address);
      });
    });
    describe('Sender is not forwarder owner', function () {
      it('reverts', async function () {
        const calldata = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          roleDescription,
        ]);
        await expect(
          ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('grantRole', function () {
    describe('Sender is forwarder owner', function () {
      it('grants role', async function () {
        const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          roleDescription,
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        const calldata2 = accessControlRegistry.interface.encodeFunctionData('grantRole', [
          role,
          roles.account.address,
        ]);
        await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
        await expect(
          ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata2)
        )
          .to.emit(accessControlRegistry, 'RoleGranted')
          .withArgs(role, roles.account.address, ownableCallForwarder.address);
      });
    });
    describe('Sender is not forwarder owner', function () {
      it('reverts', async function () {
        const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          roleDescription,
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        const calldata2 = accessControlRegistry.interface.encodeFunctionData('grantRole', [
          role,
          roles.account.address,
        ]);
        await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
        await expect(
          ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata2)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('revokeRole', function () {
    describe('Sender is forwarder owner', function () {
      it('revokes role', async function () {
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        const calldataInitializeRoleAndGrantToSender = accessControlRegistry.interface.encodeFunctionData(
          'initializeRoleAndGrantToSender',
          [managerRootRole, roleDescription]
        );
        const calldataGrantRole = accessControlRegistry.interface.encodeFunctionData('grantRole', [
          role,
          roles.account.address,
        ]);
        const calldata1 = accessControlRegistry.interface.encodeFunctionData('multicall', [
          [calldataInitializeRoleAndGrantToSender, calldataGrantRole],
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
        const calldata2 = accessControlRegistry.interface.encodeFunctionData('revokeRole', [
          role,
          roles.account.address,
        ]);
        await expect(
          ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata2)
        )
          .to.emit(accessControlRegistry, 'RoleRevoked')
          .withArgs(role, roles.account.address, ownableCallForwarder.address);
      });
    });
    describe('Sender is not forwarder owner', function () {
      it('reverts', async function () {
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        const calldataInitializeRoleAndGrantToSender = accessControlRegistry.interface.encodeFunctionData(
          'initializeRoleAndGrantToSender',
          [managerRootRole, roleDescription]
        );
        const calldataGrantRole = accessControlRegistry.interface.encodeFunctionData('grantRole', [
          role,
          roles.account.address,
        ]);
        const calldata1 = accessControlRegistry.interface.encodeFunctionData('multicall', [
          [calldataInitializeRoleAndGrantToSender, calldataGrantRole],
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
        const calldata2 = accessControlRegistry.interface.encodeFunctionData('revokeRole', [
          role,
          roles.account.address,
        ]);
        await expect(
          ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata2)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('renounceRole', function () {
    describe('Sender is forwarder owner', function () {
      it('renounces role', async function () {
        const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          roleDescription,
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        const calldata2 = accessControlRegistry.interface.encodeFunctionData('renounceRole', [
          role,
          ownableCallForwarder.address,
        ]);
        await expect(
          ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata2)
        )
          .to.emit(accessControlRegistry, 'RoleRevoked')
          .withArgs(role, ownableCallForwarder.address, ownableCallForwarder.address);
      });
    });
    describe('Sender is not forwarder owner', function () {
      it('reverts', async function () {
        const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeRoleAndGrantToSender', [
          managerRootRole,
          roleDescription,
        ]);
        await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
        await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
        const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
        const calldata2 = accessControlRegistry.interface.encodeFunctionData('renounceRole', [
          role,
          ownableCallForwarder.address,
        ]);
        await expect(
          ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata2)
        ).to.be.revertedWith('Ownable: caller is not the owner');
      });
    });
  });

  describe('MockCallForwarderTarget', function () {
    context('Target address belongs to a contract', function () {
      context('Target function exists', function () {
        context('Target function is payable', function () {
          context('Message value is zero', function () {
            context('Target function does not revert', function () {
              it('forwards call', async function () {
                const input1 = 'input1';
                const input2 = 123;
                const value = 0;
                const calldata = mockCallForwarderTarget.interface.encodeFunctionData('payableTargetFunction', [
                  input1,
                  input2,
                  value,
                ]);
                const returnedData = await ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .callStatic.forwardCall(mockCallForwarderTarget.address, calldata, { value: value });
                const expectedReturnedData = hre.ethers.utils.defaultAbiCoder.encode(
                  ['bytes', 'bool'],
                  ['0x12345678', true]
                );
                expect(returnedData).to.equal(expectedReturnedData);
                await ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .forwardCall(mockCallForwarderTarget.address, calldata, { value: value });
                expect(await mockCallForwarderTarget.storage1()).to.equal(input1);
                expect(await mockCallForwarderTarget.storage2()).to.equal(input2);
                expect(await hre.ethers.provider.getBalance(mockCallForwarderTarget.address)).to.equal(value);
              });
            });
            context('Target function reverts', function () {
              it('reverts', async function () {
                const input1 = 'this will make the call revert';
                const input2 = 123;
                const value = 0;
                const calldata = mockCallForwarderTarget.interface.encodeFunctionData('payableTargetFunction', [
                  input1,
                  input2,
                  value,
                ]);
                await expect(
                  ownableCallForwarder
                    .connect(roles.forwarderOwner)
                    .forwardCall(mockCallForwarderTarget.address, calldata, { value: value })
                ).to.be.revertedWith('Incorrect input');
              });
            });
          });
          context('Message value is not zero', function () {
            context('Target function does not revert', function () {
              it('forwards call', async function () {
                const input1 = 'input1';
                const input2 = 123;
                const value = 456;
                const calldata = mockCallForwarderTarget.interface.encodeFunctionData('payableTargetFunction', [
                  input1,
                  input2,
                  value,
                ]);
                const returnedData = await ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .callStatic.forwardCall(mockCallForwarderTarget.address, calldata, { value: value });
                const expectedReturnedData = hre.ethers.utils.defaultAbiCoder.encode(
                  ['bytes', 'bool'],
                  ['0x12345678', true]
                );
                expect(returnedData).to.equal(expectedReturnedData);
                await ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .forwardCall(mockCallForwarderTarget.address, calldata, { value: value });
                expect(await mockCallForwarderTarget.storage1()).to.equal(input1);
                expect(await mockCallForwarderTarget.storage2()).to.equal(input2);
                expect(await hre.ethers.provider.getBalance(mockCallForwarderTarget.address)).to.equal(value);
              });
            });
            context('Target function reverts', function () {
              it('reverts', async function () {
                const input1 = 'this will make the call revert';
                const input2 = 123;
                const value = 456;
                const calldata = mockCallForwarderTarget.interface.encodeFunctionData('payableTargetFunction', [
                  input1,
                  input2,
                  value,
                ]);
                await expect(
                  ownableCallForwarder
                    .connect(roles.forwarderOwner)
                    .forwardCall(mockCallForwarderTarget.address, calldata, { value: value })
                ).to.be.revertedWith('Incorrect input');
              });
            });
          });
        });
        context('Target function is not payable', function () {
          context('Message value is zero', function () {
            context('Target function does not revert', function () {
              it('forwards call', async function () {
                const input1 = 'input1';
                const input2 = 123;
                const calldata = mockCallForwarderTarget.interface.encodeFunctionData('nonpayableTargetFunction', [
                  input1,
                  input2,
                ]);
                const returnedData = await ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .callStatic.forwardCall(mockCallForwarderTarget.address, calldata);
                const expectedReturnedData = hre.ethers.utils.defaultAbiCoder.encode(
                  ['bytes', 'bool'],
                  ['0x12345678', true]
                );
                expect(returnedData).to.equal(expectedReturnedData);
                await ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .forwardCall(mockCallForwarderTarget.address, calldata);
                expect(await mockCallForwarderTarget.storage1()).to.equal(input1);
                expect(await mockCallForwarderTarget.storage2()).to.equal(input2);
              });
            });
            context('Target function reverts', function () {
              it('reverts', async function () {
                const input1 = 'this will make the call revert';
                const input2 = 123;
                const calldata = mockCallForwarderTarget.interface.encodeFunctionData('nonpayableTargetFunction', [
                  input1,
                  input2,
                ]);
                await expect(
                  ownableCallForwarder
                    .connect(roles.forwarderOwner)
                    .forwardCall(mockCallForwarderTarget.address, calldata)
                ).to.be.revertedWith('Incorrect input');
              });
            });
          });
          context('Message value is not zero', function () {
            it('reverts', async function () {
              const input1 = 'input1';
              const input2 = 123;
              const value = 456;
              const calldata = mockCallForwarderTarget.interface.encodeFunctionData('nonpayableTargetFunction', [
                input1,
                input2,
              ]);
              await expect(
                ownableCallForwarder
                  .connect(roles.forwarderOwner)
                  .forwardCall(mockCallForwarderTarget.address, calldata, { value: value })
              ).to.be.revertedWith('Address: low-level call with value failed');
            });
          });
        });
      });
      context('Target function does not exist', function () {
        it('reverts', async function () {
          const nonexistentFunctionSelector = '0x12345678';
          await expect(
            ownableCallForwarder
              .connect(roles.forwarderOwner)
              .forwardCall(mockCallForwarderTarget.address, nonexistentFunctionSelector)
          ).to.be.revertedWith('Address: low-level call with value failed');
        });
      });
    });
    context('Target address does not belong to a contract', function () {
      it('reverts', async function () {
        await expect(
          ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(hre.ethers.constants.AddressZero, '0x')
        ).to.be.revertedWith('Address: call to non-contract');
      });
    });

    context('Target function does not revert', function () {
      it('forwards value', async function () {
        const input1 = 'input1';
        const input2 = 123;
        const value = 456;
        const calldata = mockCallForwarderTarget.interface.encodeFunctionData('payableTargetFunction', [
          input1,
          input2,
          value,
        ]);
        const returnedData = await ownableCallForwarder
          .connect(roles.forwarderOwner)
          .callStatic.forwardCall(mockCallForwarderTarget.address, calldata, { value: value });
        const expectedReturnedData = hre.ethers.utils.defaultAbiCoder.encode(['bytes', 'bool'], ['0x12345678', true]);
        expect(returnedData).to.equal(expectedReturnedData);
        await ownableCallForwarder
          .connect(roles.forwarderOwner)
          .forwardCall(mockCallForwarderTarget.address, calldata, { value: value });
        expect(await mockCallForwarderTarget.storage1()).to.equal(input1);
        expect(await mockCallForwarderTarget.storage2()).to.equal(input2);
        expect(await hre.ethers.provider.getBalance(mockCallForwarderTarget.address)).to.equal(value);
      });
    });
    context('Target function does not exist', function () {
      it('reverts', async function () {
        await expect(
          ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(mockCallForwarderTarget.address, '0xabcd')
        ).to.be.revertedWith('Address: low-level call with value failed');
      });
    });
    context('Target function reverts', function () {
      it('reverts', async function () {
        const input1 = 'this will make the call revert';
        const input2 = 123;
        const value = 456;
        const calldata = mockCallForwarderTarget.interface.encodeFunctionData('payableTargetFunction', [
          input1,
          input2,
          value,
        ]);
        await expect(
          ownableCallForwarder
            .connect(roles.forwarderOwner)
            .forwardCall(mockCallForwarderTarget.address, calldata, { value: value })
        ).to.be.revertedWith('Incorrect input');
      });
    });
  });
});
