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
    expect(retrievedProvider.admin).to.equal(roles.providerAdmin._address);
    expect(retrievedProvider.xpub).to.equal(providerXpub);
  });
});

describe('updateProvider', function () {
  context('If the caller is the provider admin', async function () {
    it('updates the provider record', async function () {
      let providerXpub, providerId;
      ({ providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      // Update the provider record
      await expect(airnode.connect(roles.providerAdmin).updateProvider(providerId, roles.updatedProviderAdmin._address))
        .to.emit(airnode, 'ProviderUpdated')
        .withArgs(providerId, roles.updatedProviderAdmin._address);
      // Check the updated provider record
      const retrievedProvider = await airnode.getProvider(providerId);
      expect(retrievedProvider.admin).to.equal(roles.updatedProviderAdmin._address);
      expect(retrievedProvider.xpub).to.equal(providerXpub);
    });
  });
  context('If the caller is not the provider admin', async function () {
    it('reverts', async function () {
      let providerId;
      ({ providerId } = await createProvider(airnode, roles.providerAdmin));
      // Attempt to update the provider record
      await expect(
        airnode.connect(roles.randomPerson).updateProvider(providerId, roles.updatedProviderAdmin._address)
      ).to.be.revertedWith('Caller is not provider admin');
    });
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
      const requesterInd = await createRequester(airnode, roles.requesterAdmin);
      const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterInd.toString()}`);
      await expect(
        airnode
          .connect(roles.randomPerson)
          .requestWithdrawal(providerId, requesterInd, designatedWallet, roles.randomPerson._address)
      ).to.be.revertedWith('Caller is not requester admin');
    });
  });
});

describe('fulfillWithdrawal', function () {
  context('If the parameters are correct', async function () {
    it('fulfills withdrawal', async function () {
      let providerMnemonic, providerXpub, providerId;
      ({ providerMnemonic, providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      const requesterInd = await createRequester(airnode, roles.requesterAdmin);
      const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterInd.toString()}`);
      const destination = roles.requesterAdmin._address;
      const withdrawalRequestId = await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
      await roles.requesterAdmin.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther('0.1'),
      });
      // Estimate the gas required to fulfill the withdrawal request
      const gasEstimate = await airnode
        .connect(designatedWallet)
        .estimateGas.fulfillWithdrawal(withdrawalRequestId, providerId, requesterInd, destination, { value: 1 });
      const gasLimit = ethers.BigNumber.from(80_000);
      expect(gasLimit.gt(gasEstimate)).to.equal(true);
      // Calculate the amount that will be sent back to the requester admin
      const gasPrice = await waffle.provider.getGasPrice();
      const txCost = gasLimit.mul(gasPrice);
      const designatedWalletBalance = await waffle.provider.getBalance(designatedWallet.address);
      const fundsToSend = designatedWalletBalance.sub(txCost);
      // Fulfill the withdrawal request with the designated wallet
      const initialRequesterAdminBalance = await waffle.provider.getBalance(roles.requesterAdmin._address);
      const expectedRequesterAdminBalance = initialRequesterAdminBalance.add(fundsToSend);
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterInd, destination, {
            value: fundsToSend,
            gasLimit: gasLimit,
            gasPrice: gasPrice,
          })
      )
        .to.emit(airnode, 'WithdrawalFulfilled')
        .withArgs(providerId, requesterInd, withdrawalRequestId, designatedWallet.address, destination, fundsToSend);
      expect(await waffle.provider.getBalance(roles.requesterAdmin._address)).to.equal(expectedRequesterAdminBalance);
    });
    context('If the withdrawal is already fulfilled', async function () {
      it('reverts', async function () {
        let providerMnemonic, providerXpub, providerId;
        ({ providerMnemonic, providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
        const requesterInd = await createRequester(airnode, roles.requesterAdmin);
        const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterInd.toString()}`);
        const destination = roles.requesterAdmin._address;
        const withdrawalRequestId = await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
        await roles.requesterAdmin.sendTransaction({
          to: designatedWallet.address,
          value: ethers.utils.parseEther('0.1'),
        });
        await airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterInd, destination, { value: 1 });
        await expect(
          airnode
            .connect(designatedWallet)
            .fulfillWithdrawal(withdrawalRequestId, providerId, requesterInd, destination, { value: 1 })
        ).to.be.revertedWith('No such withdrawal request');
      });
    });
  });
  context('If the parameters are incorrect', async function () {
    it('reverts', async function () {
      let providerMnemonic, providerXpub, providerId;
      ({ providerMnemonic, providerXpub, providerId } = await createProvider(airnode, roles.providerAdmin));
      const requesterInd = await createRequester(airnode, roles.requesterAdmin);
      const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterInd.toString()}`);
      const destination = roles.requesterAdmin._address;
      const withdrawalRequestId = await requestWithdrawal(airnode, roles.requesterAdmin, providerXpub, providerId);
      await roles.requesterAdmin.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther('0.1'),
      });
      await expect(
        airnode
          .connect(roles.randomPerson)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterInd, destination, { value: 1 })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(ethers.constants.HashZero, providerId, requesterInd, destination, { value: 1 })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, ethers.constants.HashZero, requesterInd, destination, { value: 1 })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, ethers.constants.Zero, destination, { value: 1 })
      ).to.be.revertedWith('No such withdrawal request');
      await expect(
        airnode
          .connect(designatedWallet)
          .fulfillWithdrawal(withdrawalRequestId, providerId, requesterInd, ethers.constants.AddressZero, { value: 1 })
      ).to.be.revertedWith('No such withdrawal request');
    });
  });
});
