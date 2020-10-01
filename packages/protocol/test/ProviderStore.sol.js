const { expect } = require('chai');
const { verifyLog, deriveWalletFromPath, deriveWalletAddressFromPath } = require('./util');

let airnode;
let roles;
let providerMnemonic;
let providerXpub;

async function createProvider() {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  // No need to call .derivePath() as we will use the master wallet
  const masterWallet = new ethers.Wallet(masterHdNode.privateKey, waffle.provider);
  // Fund the master wallet for it to be able to create the provider record
  await roles.providerAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('0.1'),
  });
  // Estimate the gas required to create the provider record
  const gasEstimate = await airnode
    .connect(masterWallet)
    .estimateGas.createProvider(roles.providerAdmin._address, providerXpub, { value: 1 });
  const gasLimit = ethers.BigNumber.from(200_000);
  expect(gasLimit.gt(gasEstimate)).to.equal(true);
  // Calculate the amount that will be sent back to the provider admin
  const gasPrice = await waffle.provider.getGasPrice();
  const txCost = gasLimit.mul(gasPrice);
  const masterWalletBalance = await waffle.provider.getBalance(masterWallet.address);
  const fundsToSend = masterWalletBalance.sub(txCost);
  // Create the provider record with the provider master wallet
  const expectedProviderId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address])
  );
  const initialProviderAdminBalance = await waffle.provider.getBalance(roles.providerAdmin._address);
  const expectedProviderAdminBalance = initialProviderAdminBalance.add(fundsToSend);
  await expect(
    airnode.connect(masterWallet).createProvider(roles.providerAdmin._address, providerXpub, {
      value: fundsToSend,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
    })
  )
    .to.emit(airnode, 'ProviderCreated')
    .withArgs(expectedProviderId, roles.providerAdmin._address, providerXpub);
  expect(await waffle.provider.getBalance(roles.providerAdmin._address)).to.equal(expectedProviderAdminBalance);
  return expectedProviderId;
}

async function requestWithdrawal() {
  await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
  const requesterInd = ethers.BigNumber.from(1);
  const providerId = await createProvider();
  const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterInd.toString()}`);
  const destination = roles.requesterAdmin._address;
  const tx = await airnode
    .connect(roles.requesterAdmin)
    .requestWithdrawal(providerId, requesterInd, designatedWallet, destination);
  const log = await verifyLog(airnode, tx, 'WithdrawalRequested(bytes32,uint256,bytes32,address,address)', {
    providerId: providerId,
    requesterInd: requesterInd,
    designatedWallet: designatedWallet,
    destination: destination,
  });
  return log.args.withdrawalRequestId;
}

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

  // Create the provider private key
  const providerWallet = ethers.Wallet.createRandom();
  providerMnemonic = providerWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  providerXpub = hdNode.neuter().extendedKey;
});

describe('createProvider', function () {
  it('creates a provider record', async function () {
    const providerId = await createProvider();
    // Check the created provider record
    const retrievedProvider = await airnode.getProvider(providerId);
    expect(retrievedProvider.admin).to.equal(roles.providerAdmin._address);
    expect(retrievedProvider.xpub).to.equal(providerXpub);
  });
});

describe('updateProvider', function () {
  context('If the caller is the provider admin', async function () {
    it('updates the provider record', async function () {
      const providerId = await createProvider();
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
      const providerId = await createProvider();
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
      await requestWithdrawal();
    });
  });
  context('If the caller is not the requester admin', async function () {
    it('reverts', async function () {
      await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
      const requesterInd = ethers.BigNumber.from(1);
      const providerId = await createProvider();
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
      await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
      const requesterInd = ethers.BigNumber.from(1);
      const providerId = await createProvider();
      const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterInd.toString()}`);
      const destination = roles.requesterAdmin._address;
      const withdrawalRequestId = await requestWithdrawal();
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
        await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
        const requesterInd = ethers.BigNumber.from(1);
        const providerId = await createProvider();
        const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterInd.toString()}`);
        const destination = roles.requesterAdmin._address;
        const withdrawalRequestId = await requestWithdrawal();
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
      await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
      const requesterInd = ethers.BigNumber.from(1);
      const providerId = await createProvider();
      const designatedWallet = deriveWalletFromPath(providerMnemonic, `m/0/${requesterInd.toString()}`);
      const destination = roles.requesterAdmin._address;
      const withdrawalRequestId = await requestWithdrawal();
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
