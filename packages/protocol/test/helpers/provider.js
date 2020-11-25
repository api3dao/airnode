const { expect } = require('chai');
const { verifyLog, deriveWalletAddressFromPath } = require('../util');

function createProviderPrivateKey() {
  const providerWallet = ethers.Wallet.createRandom();
  const providerMnemonic = providerWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  const providerXpub = hdNode.neuter().extendedKey;
  return { providerMnemonic, providerXpub };
}

async function createProvider(airnode, providerAdminRole) {
  let providerMnemonic, providerXpub;
  ({ providerMnemonic, providerXpub } = createProviderPrivateKey());
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  // No need to call .derivePath() as we will use the master wallet
  const masterWallet = new ethers.Wallet(masterHdNode.privateKey, waffle.provider);
  // Fund the master wallet for it to be able to create the provider record
  await providerAdminRole.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('0.1'),
  });
  // Estimate the gas required to create the provider record
  const gasEstimate = await airnode
    .connect(masterWallet)
    .estimateGas.createProvider(providerAdminRole._address, providerXpub, { value: 1 });
  const gasLimit = ethers.BigNumber.from(200000);
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
  const initialProviderAdminBalance = await waffle.provider.getBalance(providerAdminRole._address);
  const expectedProviderAdminBalance = initialProviderAdminBalance.add(fundsToSend);
  await expect(
    airnode.connect(masterWallet).createProvider(providerAdminRole._address, providerXpub, {
      value: fundsToSend,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
    })
  )
    .to.emit(airnode, 'ProviderCreated')
    .withArgs(expectedProviderId, providerAdminRole._address, providerXpub);
  expect(await waffle.provider.getBalance(providerAdminRole._address)).to.equal(expectedProviderAdminBalance);
  return { providerMnemonic, providerXpub, providerId: expectedProviderId };
}

async function requestWithdrawal(airnode, requesterAdminRole, providerXpub, providerId) {
  await airnode.connect(requesterAdminRole).createRequester(requesterAdminRole._address);
  const requesterInd = ethers.BigNumber.from(1);
  const designatedWallet = deriveWalletAddressFromPath(providerXpub, `m/0/${requesterInd.toString()}`);
  const destination = requesterAdminRole._address;
  const tx = await airnode
    .connect(requesterAdminRole)
    .requestWithdrawal(providerId, requesterInd, designatedWallet, destination);
  const log = await verifyLog(airnode, tx, 'WithdrawalRequested(bytes32,uint256,bytes32,address,address)', {
    providerId,
    requesterInd,
    designatedWallet,
    destination,
  });
  return log.args.withdrawalRequestId;
}

module.exports = {
  createProvider: createProvider,
  requestWithdrawal: requestWithdrawal,
};
