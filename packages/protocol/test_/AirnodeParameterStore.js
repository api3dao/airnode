/* globals context ethers */

const { expect } = require('chai');

let airnodeRrp, authorizerAlwaysTrue, authorizerAlwaysFalse;
let roles;
const requesterIndex = 1;
let airnodeXpub, airnodeId, masterWallet, designatedWallet;
const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
const clientAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    airnodeAdmin: accounts[1],
    updatedAirnodeAdmin: accounts[2],
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
  // Generate the Airnode private key and derive the related parameters
  const airnodeWallet = ethers.Wallet.createRandom();
  const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic);
  airnodeXpub = hdNode.neuter().extendedKey;
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  airnodeId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(airnodeMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the Airnode master wallet for it to be able to set the Airnode parameters
  await roles.airnodeAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
  // Fund the designated wallet so that it can be withdrawn from
  await roles.requesterAdmin.sendTransaction({
    to: designatedWallet.address,
    value: ethers.utils.parseEther('1'),
  });
});

describe('setAirnodeParameters', function () {
  it('sets Airnode parameters', async function () {
    // Generate random addresses as the authorizer contracts
    const authorizers = Array.from({ length: 5 }, () =>
      ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
    );
    // Set the Airnode parameters
    await expect(
      airnodeRrp
        .connect(masterWallet)
        .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 })
    )
      .to.emit(airnodeRrp, 'AirnodeParametersSet')
      .withArgs(airnodeId, roles.airnodeAdmin.address, airnodeXpub, authorizers);
  });
});

describe('requestWithdrawal', function () {
  context('Caller is requester admin', async function () {
    it('requests withdrawal', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the Airnode parameters
      await airnodeRrp
        .connect(masterWallet)
        .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
      // Derive the expected withdrawal request ID
      const withdrawalRequestId = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['uint256', 'uint256', 'uint256'],
          [
            await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex),
            (await ethers.provider.getNetwork()).chainId,
            requesterIndex,
          ]
        )
      );
      // Request withdrawal
      await expect(
        airnodeRrp
          .connect(roles.requesterAdmin)
          .requestWithdrawal(airnodeId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address)
      )
        .to.emit(airnodeRrp, 'WithdrawalRequested')
        .withArgs(
          airnodeId,
          requesterIndex,
          withdrawalRequestId,
          designatedWallet.address,
          roles.requesterAdmin.address
        );
    });
  });
  context('Caller not requester admin', async function () {
    it('reverts when caller is not a requester admin', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the Airnode parameters
      await airnodeRrp
        .connect(masterWallet)
        .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
      // Atttempt to request withdrawal
      await expect(
        airnodeRrp
          .connect(roles.randomPerson)
          .requestWithdrawal(airnodeId, requesterIndex, designatedWallet.address, roles.randomPerson.address)
      ).to.be.revertedWith('Caller not requester admin');
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
        // Set the Airnode parameters
        await airnodeRrp
          .connect(masterWallet)
          .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
        // Derive the expected withdrawal request ID
        const withdrawalRequestId = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ['uint256', 'uint256', 'uint256'],
            [
              await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex),
              (await ethers.provider.getNetwork()).chainId,
              requesterIndex,
            ]
          )
        );
        // Request withdrawal
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .requestWithdrawal(airnodeId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address);
        // Estimate the gas required to fulfill the withdrawal request
        const gasEstimate = await airnodeRrp
          .connect(designatedWallet)
          .estimateGas.fulfillWithdrawal(withdrawalRequestId, airnodeId, requesterIndex, roles.requesterAdmin.address, {
            value: 1,
            gasLimit: 500000,
          });
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
            .fulfillWithdrawal(withdrawalRequestId, airnodeId, requesterIndex, roles.requesterAdmin.address, {
              value: fundsToSend,
              gasLimit: gasEstimate,
              gasPrice: gasPrice,
            })
        )
          .to.emit(airnodeRrp, 'WithdrawalFulfilled')
          .withArgs(
            airnodeId,
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
      it('reverts when withdrawal destination is not payable', async function () {
        // Generate random addresses as the authorizer contracts
        const authorizers = Array.from({ length: 5 }, () =>
          ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
        );
        // Set the Airnode parameters
        await airnodeRrp
          .connect(masterWallet)
          .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
        // Derive the expected withdrawal request ID
        const withdrawalRequestId = ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ['uint256', 'uint256', 'uint256'],
            [
              await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex),
              (await ethers.provider.getNetwork()).chainId,
              requesterIndex,
            ]
          )
        );
        // Request withdrawal (using Airnode RRP as it has no default payable method)
        await airnodeRrp
          .connect(roles.requesterAdmin)
          .requestWithdrawal(airnodeId, requesterIndex, designatedWallet.address, airnodeRrp.address);
        // Attempt to fulfill the withdrawal request
        await expect(
          airnodeRrp
            .connect(designatedWallet)
            .fulfillWithdrawal(withdrawalRequestId, airnodeId, requesterIndex, airnodeRrp.address, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Transfer failed');
      });
    });
  });
  context('Fulfillment parameters are incorrect', async function () {
    it('reverts when parameters are incorrect', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the Airnode parameters
      await airnodeRrp
        .connect(masterWallet)
        .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
      // Derive the expected withdrawal request ID
      const withdrawalRequestId = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['uint256', 'uint256', 'uint256'],
          [
            await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex),
            (await ethers.provider.getNetwork()).chainId,
            requesterIndex,
          ]
        )
      );
      // Request withdrawal
      await airnodeRrp
        .connect(roles.requesterAdmin)
        .requestWithdrawal(airnodeId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address);
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(designatedWallet)
          .fulfillWithdrawal(ethers.constants.HashZero, airnodeId, requesterIndex, roles.requesterAdmin.address, {
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
          .fulfillWithdrawal(withdrawalRequestId, airnodeId, ethers.constants.Zero, roles.requesterAdmin.address, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, airnodeId, requesterIndex, ethers.constants.AddressZero, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
    });
  });
  context('Fulfilling wallet is incorrect', async function () {
    it('reverts when the fulfilling wallet is incorrect', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the Airnode parameters
      await airnodeRrp
        .connect(masterWallet)
        .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
      // Derive the expected withdrawal request ID
      const withdrawalRequestId = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ['uint256', 'uint256', 'uint256'],
          [
            await airnodeRrp.requesterIndexToNextWithdrawalRequestIndex(requesterIndex),
            (await ethers.provider.getNetwork()).chainId,
            requesterIndex,
          ]
        )
      );
      // Request withdrawal
      await airnodeRrp
        .connect(roles.requesterAdmin)
        .requestWithdrawal(airnodeId, requesterIndex, designatedWallet.address, roles.requesterAdmin.address);
      // Attempt to fulfill the withdrawal request
      await expect(
        airnodeRrp
          .connect(roles.randomPerson)
          .fulfillWithdrawal(withdrawalRequestId, airnodeId, requesterIndex, roles.requesterAdmin.address, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
    });
  });
});

describe('checkAuthorizationStatus', function () {
  it('returns false when authorizers are empty', async function () {
    const authorizers = [];
    // Set the Airnode parameters
    await airnodeRrp
      .connect(masterWallet)
      .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
    // Check authorization status
    expect(
      await airnodeRrp.checkAuthorizationStatus(
        airnodeId,
        requestId,
        endpointId,
        requesterIndex,
        designatedWallet.address,
        clientAddress
      )
    ).to.equal(false);
  });

  it('returns false when all authorizers return false', async function () {
    const authorizers = [authorizerAlwaysFalse.address, authorizerAlwaysFalse.address, authorizerAlwaysFalse.address];
    // Set the Airnode parameters
    await airnodeRrp
      .connect(masterWallet)
      .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
    // Check authorization status
    expect(
      await airnodeRrp.checkAuthorizationStatus(
        airnodeId,
        requestId,
        endpointId,
        requesterIndex,
        designatedWallet.address,
        clientAddress
      )
    ).to.equal(false);
  });

  context('authorizers array contains a zero address', async function () {
    it('returns true', async function () {
      const authorizers = [authorizerAlwaysFalse.address, ethers.constants.AddressZero];
      // Set the Airnode parameters
      await airnodeRrp
        .connect(masterWallet)
        .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
      // Check authorization status
      expect(
        await airnodeRrp.checkAuthorizationStatus(
          airnodeId,
          requestId,
          endpointId,
          requesterIndex,
          designatedWallet.address,
          clientAddress
        )
      ).to.equal(true);
    });
  });

  it('returns true when at least one authorizer returns true', async function () {
    const authorizers = [authorizerAlwaysFalse.address, authorizerAlwaysTrue.address, authorizerAlwaysFalse.address];
    // Set the Airnode parameters
    await airnodeRrp
      .connect(masterWallet)
      .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
    // Check authorization status
    expect(
      await airnodeRrp.checkAuthorizationStatus(
        airnodeId,
        requestId,
        endpointId,
        requesterIndex,
        designatedWallet.address,
        clientAddress
      )
    ).to.equal(true);
  });
});

describe('getAirnodeParameters', function () {
  it('gets Airnode parameters', async function () {
    // Generate random addresses as the authorizer contracts
    const authorizers = Array.from({ length: 5 }, () =>
      ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
    );
    // Set the Airnode parameters
    await airnodeRrp
      .connect(masterWallet)
      .setAirnodeParameters(roles.airnodeAdmin.address, airnodeXpub, authorizers, { gasLimit: 500000 });
    // Get the Airnode paremeters and verify its fields
    const airnodeParameters = await airnodeRrp.getAirnodeParameters(airnodeId);
    expect(airnodeParameters.admin).to.equal(roles.airnodeAdmin.address);
    expect(airnodeParameters.xpub).to.equal(airnodeXpub);
    expect(airnodeParameters.authorizers).to.deep.equal(authorizers);
  });
});
