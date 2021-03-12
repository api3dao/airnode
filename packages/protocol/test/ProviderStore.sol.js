const { expect } = require('chai');

let airnodeRrp, authorizerAlwaysTrue, authorizerAlwaysFalse;
let roles;
const requesterIndex = 1;
let providerXpub, providerId, masterWallet, designatedWallet;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const clientAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    updatedProviderAdmin: accounts[2],
    requesterAdmin: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeRrpFactory = await ethers.getContractFactory('AirnodeRrp', roles.deployer);
  airnodeRrp = await airnodeRrpFactory.deploy();
  const mockAuthorizerAlwaysTrueFactory = await ethers.getContractFactory('MockAuthorizerAlwaysTrue', roles.deployer);
  authorizerAlwaysTrue = await mockAuthorizerAlwaysTrueFactory.deploy();
  const mockAuthorizerAlwaysFalseFactory = await ethers.getContractFactory('MockAuthorizerAlwaysFalse', roles.deployer);
  authorizerAlwaysFalse = await mockAuthorizerAlwaysFalseFactory.deploy();
  // Create the requester
  await airnodeRrp.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin.address);
  // Generate the provider private key and derive the related parameters
  const providerWallet = ethers.Wallet.createRandom();
  const providerMnemonic = providerWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  providerXpub = hdNode.neuter().extendedKey;
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(providerMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the provider master wallet for it to be able to set the provider parameters
  await roles.providerAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Fund the designated wallet so that it can be withdrawn from
  await roles.requesterAdmin.sendTransaction({
    to: designatedWallet.address,
    value: ethers.utils.parseEther('1'),
  });
});

describe('setProviderParameters', function () {
  it('sets provider parameters', async function () {
    // Generate random addresses as the authorizer contracts
    const authorizers = Array.from({ length: 5 }, () =>
      ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
    );
    // Set the provider parameters
    await expect(
      airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 })
    )
      .to.emit(airnodeRrp, 'ProviderParametersSet')
      .withArgs(providerId, roles.providerAdmin.address, providerXpub, authorizers);
  });
});

describe('requestWithdrawal', function () {
  context('Caller is requester admin', async function () {
    it('requests withdrawal', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Derive the expected withdrawal request ID
      const withdrawalRequestId = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['uint256', 'uint256', 'address'],
          [await airnodeRrp.requesterIndexToNoWithdrawalRequests(requesterIndex), requesterIndex, airnodeRrp.address]
        )
      );
      // Request withdrawal
      await expect(
        airnodeRrp
          .connect(roles.requesterAdmin)
          .requestWithdrawal(providerId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address)
      )
        .to.emit(airnodeRrp, 'WithdrawalRequested')
        .withArgs(
          providerId,
          requesterIndex,
          withdrawalRequestId,
          designatedWallet.address,
          roles.requesterAdmin.address
        );
    });
  });
  context('Caller is not requester admin', async function () {
    it('reverts', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Atttempt to request withdrawal
      await expect(
        airnodeRrp
          .connect(roles.randomPerson)
          .requestWithdrawal(providerId, requesterIndex, designatedWallet.address, roles.randomPerson.address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });
});

describe('fulfillWithdrawal', function () {
  context('Fulfillment parameters are correct', async function () {
    context('Withdrawal destination is payable', async function () {
      it('fulfills withdrawal request', async function () {
        // Generate random addresses as the authorizer contracts
        const authorizers = Array.from({ length: 5 }, () =>
          ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
        );
        // Set the provider parameters
        await airnodeRrp
          .connect(masterWallet)
          .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
        // Derive the expected withdrawal request ID
        const withdrawalRequestId = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address'],
            [await airnodeRrp.requesterIndexToNoWithdrawalRequests(requesterIndex), requesterIndex, airnodeRrp.address]
          )
        );
        // Request withdrawal
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .requestWithdrawal(providerId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address);
        // Estimate the gas required to fulfill the withdrawal request
        const gasEstimate = await airnodeRrp
          .connect(designatedWallet)
          .estimateGas.fulfillWithdrawal(
            withdrawalRequestId,
            providerId,
            requesterIndex,
            roles.requesterAdmin.address,
            {
              value: 1,
              gasLimit: 500000,
            }
          );
        // Calculate the amount that will be sent back to the requester admin
        const gasPrice = await waffle.provider.getGasPrice();
        const txCost = gasEstimate.mul(gasPrice);
        const designatedWalletBalance = await waffle.provider.getBalance(designatedWallet.address);
        const fundsToSend = designatedWalletBalance.sub(txCost);
        // Fulfill the withdrawal request with the designated wallet
        const initialRequesterAdminBalance = await waffle.provider.getBalance(roles.requesterAdmin.address);
        const expectedRequesterAdminBalance = initialRequesterAdminBalance.add(fundsToSend);
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, roles.requesterAdmin.address, {
              value: fundsToSend,
              gasLimit: gasEstimate,
              gasPrice: gasPrice,
            })
        )
          .to.emit(airnodeRrp, 'WithdrawalFulfilled')
          .withArgs(
            providerId,
            requesterIndex,
            withdrawalRequestId,
            designatedWallet.address,
            roles.requesterAdmin.address,
            fundsToSend
          );
        expect(await waffle.provider.getBalance(roles.requesterAdmin.address)).to.equal(expectedRequesterAdminBalance);
      });
    });
    context('Withdrawal destination is not payable', async function () {
      it('reverts', async function () {
        // Generate random addresses as the authorizer contracts
        const authorizers = Array.from({ length: 5 }, () =>
          ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
        );
        // Set the provider parameters
        await airnodeRrp
          .connect(masterWallet)
          .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
        // Derive the expected withdrawal request ID
        const withdrawalRequestId = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ['uint256', 'uint256', 'address'],
            [await airnodeRrp.requesterIndexToNoWithdrawalRequests(requesterIndex), requesterIndex, airnodeRrp.address]
          )
        );
        // Request withdrawal (using Airnode RRP as it has no default payable method)
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .requestWithdrawal(providerId, requesterIndex, designatedWallet.address, airnodeRrp.address);
        // Attempt to fulfill the withdrawal request
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, airnodeRrp.address, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Transfer failed');
      });
    });
  });
  context('Fulfillment parameters are incorrect', async function () {
    it('reverts', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Derive the expected withdrawal request ID
      const withdrawalRequestId = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['uint256', 'uint256', 'address'],
          [await airnodeRrp.requesterIndexToNoWithdrawalRequests(requesterIndex), requesterIndex, airnodeRrp.address]
        )
      );
      // Request withdrawal
      await airnodeRrp
        .connect(roles.requesterAdmin)
        .requestWithdrawal(providerId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address);
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(designatedWallet)
          .fulfillWithdrawal(ethers.constants.HashZero, providerId, requesterIndex, roles.requesterAdmin.address, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(designatedWallet)
          .fulfillWithdrawal(
            withdrawalRequestId,
            ethers.constants.HashZero,
            requesterIndex,
            roles.requesterAdmin.address,
            {
              value: 1,
              gasLimit: 500000,
            }
          )
      ).to.be.revertedWith('No such withdrawal request');
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, ethers.constants.Zero, roles.requesterAdmin.address, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, ethers.constants.AddressZero, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
    });
  });
  context('Fulfilling wallet is incorrect', async function () {
    it('reverts', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Derive the expected withdrawal request ID
      const withdrawalRequestId = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['uint256', 'uint256', 'address'],
          [await airnodeRrp.requesterIndexToNoWithdrawalRequests(requesterIndex), requesterIndex, airnodeRrp.address]
        )
      );
      // Request withdrawal
      await airnodeRrp
        .connect(roles.requesterAdmin)
        .requestWithdrawal(providerId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address);
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(roles.randomPerson)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, roles.requesterAdmin.address, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
    });
  });
});

describe('checkAuthorizationStatus', function () {
  context('authorizers array is empty', async function () {
    it('returns false', async function () {
      const authorizers = [];
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Check authorization status
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          providerId,
          requestId,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          clientAddress
        )
      ).to.equal(false);
    });
  });
  context('All authorizers return false', async function () {
    it('returns false', async function () {
      const authorizers = [authorizerAlwaysFalse.address, authorizerAlwaysFalse.address, authorizerAlwaysFalse.address];
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Check authorization status
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          providerId,
          requestId,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          clientAddress
        )
      ).to.equal(false);
    });
  });
  context('authorizers array contains a zero address', async function () {
    it('returns true', async function () {
      const authorizers = [authorizerAlwaysFalse.address, ethers.constants.AddressZero];
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Check authorization status
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          providerId,
          requestId,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          clientAddress
        )
      ).to.equal(true);
    });
  });
  context('At least one of the authorizers returns true', async function () {
    it('returns true', async function () {
      const authorizers = [authorizerAlwaysFalse.address, authorizerAlwaysTrue.address, authorizerAlwaysFalse.address];
      // Set the provider parameters
      await airnodeRrp
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Check authorization status
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          providerId,
          requestId,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          clientAddress
        )
      ).to.equal(true);
    });
  });
});

describe('getProvider', function () {
  it('gets provider', async function () {
    // Generate random addresses as the authorizer contracts
    const authorizers = Array.from({ length: 5 }, () =>
      ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
    );
    // Set the provider parameters
    await airnodeRrp
      .connect(masterWallet)
      .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
    // Get the provider and verify its fields
    const provider = await airnodeRrp.getProvider(providerId);
    expect(provider.admin).to.equal(roles.providerAdmin.address);
    expect(provider.xpub).to.equal(providerXpub);
    expect(provider.authorizers).to.deep.equal(authorizers);
  });
});
