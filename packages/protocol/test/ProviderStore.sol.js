const { expect } = require('chai');
const { deriveWalletFromPath, deriveWalletAddressFromPath } = require('./util');
const { createProvider, requestWithdrawal } = require('./helpers/provider');
const { createRequester } = require('./helpers/requester');

let airnode;
let roles;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    updatedProviderAdmin: accounts[2],
    requesterAdmin: accounts[3],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
});

describe('createProvider', function () {
  it('creates a provider record', async function () {
    let providerXpub, providerId;
    ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
    // Check the created provider record
    const retrievedProvider = await airnode.getProvider(providerId);
    expect(retrievedProvider.admin).to.equal(roles.providerAdmin.address);
    expect(retrievedProvider.xpub).to.equal(providerXpub);
  });
});

describe('requestWithdrawal', function () {
  context('If the caller is the requester admin', async function () {
    it('requests withdrawal', async function () {
      let providerXpub, providerId;
      ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      await createRequester(airnode, roles.requesterAdmin);
      await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
    });
  });
  context('If the caller is not the requester admin', async function () {
    it('reverts', async function () {
      let providerXpub, providerId;
      ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
      const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
      await expect(
        airnode
          .connect(roles.randomPerson)
          .requestWithdrawal(providerId, requesterIndex, designatedWallet, roles.randomPerson.address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });
});

describe('fulfillWithdrawal', function () {
  context('If the parameters are correct', async function () {
    it('fulfills withdrawal', async function () {
      let providerMnemonic, providerXpub, providerId;
      ({ providerMnemonic, providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
      const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterIndex.toString()}`);
      const destination = roles.requesterAdmin.address;
      const withdrawalRequestId = await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
      await roles.requesterAdmin.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther('0.1'),
      });
      // Estimate the gas required to fulfill the withdrawal request
      const gasEstimate = await airnode
        .connect(designatedWallet)
        .estimateGas.fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, destination, {
          value: 1,
          gasLimit: 500000,
        });
      const gasLimit = ethers.BigNumber.from(80000);
      expect(gasLimit.gt(gasEstimate)).to.equal(true);
      // Calculate the amount that will be sent back to the requester admin
      const gasPrice = await waffle.provider.getGasPrice();
      const txCost = gasLimit.mul(gasPrice);
      const designatedWalletBalance = await waffle.provider.getBalance(designatedWallet.address);
      const fundsToSend = designatedWalletBalance.sub(txCost);
      // Fulfill the withdrawal request with the designated wallet
      const initialRequesterAdminBalance = await waffle.provider.getBalance(roles.requesterAdmin.address);
      const expectedRequesterAdminBalance = initialRequesterAdminBalance.add(fundsToSend);
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, destination, {
            value: fundsToSend,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
          })
      )
        .to.emit(airnode, 'WithdrawalFulfilled')
        .withArgs(providerId, requesterIndex, withdrawalRequestId, designatedWallet.address, destination, fundsToSend);
      expect(await waffle.provider.getBalance(roles.requesterAdmin.address)).to.equal(expectedRequesterAdminBalance);
    });
    context('If the withdrawal is already fulfilled', async function () {
      it('reverts', async function () {
        let providerMnemonic, providerXpub, providerId;
        ({ providerMnemonic, providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
        const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
        const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterIndex.toString()}`);
        const destination = roles.requesterAdmin.address;
        const withdrawalRequestId = await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
        await roles.requesterAdmin.sendTransaction({
          to: designatedWallet.address,
          value: ethers.utils.parseEther('0.1'),
        });
        await airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, destination, {
            value: 1,
            gasLimit: 500000,
          });
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, destination, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('No such withdrawal request');
      });
    });
  });
  context('If the parameters are incorrect', async function () {
    it('reverts', async function () {
      let providerMnemonic, providerXpub, providerId;
      ({ providerMnemonic, providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      const requesterIndex = await createRequester(airnode, roles.requesterAdmin);
      const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterIndex.toString()}`);
      const destination = roles.requesterAdmin.address;
      const withdrawalRequestId = await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
      await roles.requesterAdmin.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther('0.1'),
      });
      await expect(
        airnode
          .connect(roles.randomPerson)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, destination, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(ethers.constants.HashZero, providerId, requesterIndex, destination, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, ethers.constants.HashZero, requesterIndex, destination, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, ethers.constants.Zero, destination, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterIndex, ethers.constants.AddressZero, {
            value: 1,
            gasLimit: 500000,
          })
      ).to.be.revertedWith('No such withdrawal request');
    });
  });
});
