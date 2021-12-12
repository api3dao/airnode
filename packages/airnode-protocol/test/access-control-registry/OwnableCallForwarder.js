/* globals context */
const hre = require('hardhat');
const { expect } = require('chai');

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
  const mockCallForwarderTargetFactory = await hre.ethers.getContractFactory('MockCallForwarderTarget', roles.deployer);
  mockCallForwarderTarget = await mockCallForwarderTargetFactory.deploy();
  const ownableCallForwarderFactory = await hre.ethers.getContractFactory('OwnableCallForwarder', roles.deployer);
  ownableCallForwarder = await ownableCallForwarderFactory.deploy();
  await ownableCallForwarder.transferOwnership(roles.forwarderOwner.address);
  managerRootRole = hre.ethers.utils.keccak256(
    hre.ethers.utils.solidityPack(['address'], [ownableCallForwarder.address])
  );
  roleDescription = 'Role description unique to adminRole';
});

describe('initializeRole', function () {
  describe('Sender is forwarder owner', function () {
    it('initializesRole', async function () {
      const calldata = accessControlRegistry.interface.encodeFunctionData('initializeRole', [
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
      const calldata = accessControlRegistry.interface.encodeFunctionData('initializeRole', [
        managerRootRole,
        roleDescription,
      ]);
      await expect(
        ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('initializeAndGrantRoles', function () {
  describe('Sender is forwarder owner', function () {
    it('initializes role', async function () {
      const calldata = accessControlRegistry.interface.encodeFunctionData('initializeAndGrantRoles', [
        [managerRootRole],
        [roleDescription],
        [roles.account.address],
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      await expect(
        ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata)
      )
        .to.emit(accessControlRegistry, 'InitializedRole')
        .withArgs(role, managerRootRole, roleDescription, ownableCallForwarder.address);
      expect(await accessControlRegistry.hasRole(role, roles.account.address)).to.equal(true);
    });
  });
  describe('Sender is not forwarder owner', function () {
    it('reverts', async function () {
      const calldata = accessControlRegistry.interface.encodeFunctionData('initializeAndGrantRoles', [
        [managerRootRole],
        [roleDescription],
        [roles.account.address],
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
      const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeRole', [
        managerRootRole,
        roleDescription,
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      const calldata2 = accessControlRegistry.interface.encodeFunctionData('grantRole', [role, roles.account.address]);
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
      const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeRole', [
        managerRootRole,
        roleDescription,
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      const calldata2 = accessControlRegistry.interface.encodeFunctionData('grantRole', [role, roles.account.address]);
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
      const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeAndGrantRoles', [
        [managerRootRole],
        [roleDescription],
        [roles.account.address],
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      const calldata2 = accessControlRegistry.interface.encodeFunctionData('revokeRole', [role, roles.account.address]);
      await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
      await expect(
        ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata2)
      )
        .to.emit(accessControlRegistry, 'RoleRevoked')
        .withArgs(role, roles.account.address, ownableCallForwarder.address);
    });
  });
  describe('Sender is not forwarder owner', function () {
    it('reverts', async function () {
      const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeAndGrantRoles', [
        [managerRootRole],
        [roleDescription],
        [roles.account.address],
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
      await expect(
        ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata1)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('renounceRole', function () {
  describe('Sender is forwarder owner', function () {
    it('renounces role', async function () {
      const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeAndGrantRoles', [
        [managerRootRole],
        [roleDescription],
        [ownableCallForwarder.address],
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      const calldata2 = accessControlRegistry.interface.encodeFunctionData('renounceRole', [
        role,
        ownableCallForwarder.address,
      ]);
      await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
      await expect(
        ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata2)
      )
        .to.emit(accessControlRegistry, 'RoleRevoked')
        .withArgs(role, ownableCallForwarder.address, ownableCallForwarder.address);
    });
  });
  describe('Sender is not forwarder owner', function () {
    it('reverts', async function () {
      const calldata1 = accessControlRegistry.interface.encodeFunctionData('initializeAndGrantRoles', [
        [managerRootRole],
        [roleDescription],
        [ownableCallForwarder.address],
      ]);
      await accessControlRegistry.connect(roles.randomPerson).initializeManager(ownableCallForwarder.address);
      const role = await accessControlRegistry.deriveRole(managerRootRole, roleDescription);
      const calldata2 = accessControlRegistry.interface.encodeFunctionData('renounceRole', [
        role,
        ownableCallForwarder.address,
      ]);
      await ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(accessControlRegistry.address, calldata1);
      await expect(
        ownableCallForwarder.connect(roles.randomPerson).forwardCall(accessControlRegistry.address, calldata2)
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});

describe('MockCallForwarderTarget', function () {
  context('Target function does not revert', function () {
    it('forwards value', async function () {
      const calldata = mockCallForwarderTarget.interface.encodeFunctionData('targetFunction', ['input1', 123]);
      const value = 456;
      const returnedData = await ownableCallForwarder
        .connect(roles.forwarderOwner)
        .callStatic.forwardCall(mockCallForwarderTarget.address, calldata, { value: value, gasLimit: 500000 });
      const expectedReturnedData = hre.ethers.utils.defaultAbiCoder.encode(['bytes', 'bool'], ['0x12345678', true]);
      expect(returnedData).to.equal(expectedReturnedData);
      await expect(
        ownableCallForwarder
          .connect(roles.forwarderOwner)
          .forwardCall(mockCallForwarderTarget.address, calldata, { value: value })
      )
        .to.emit(ownableCallForwarder, 'ForwardedCall')
        .withArgs(mockCallForwarderTarget.address, value, calldata, expectedReturnedData);
    });
  });
  context('Target function reverts', function () {
    it('reverts', async function () {
      await expect(
        ownableCallForwarder.connect(roles.forwarderOwner).forwardCall(mockCallForwarderTarget.address, '0xabcd')
      ).to.be.revertedWith('Call unsuccessful');
    });
  });
});
