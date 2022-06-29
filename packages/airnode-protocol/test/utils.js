const { ethers } = require('hardhat');
const { goSync } = require('@api3/promise-utils');

const RRP_PROTOCOL_ID = '1';

function deriveWalletPathFromSponsorAddress(sponsorAddress) {
  const sponsorAddressBN = ethers.BigNumber.from(sponsorAddress);
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedSponsorAddressBN = sponsorAddressBN.shr(31 * i);
    paths.push(shiftedSponsorAddressBN.mask(31).toString());
  }
  return `${RRP_PROTOCOL_ID}/${paths.join('/')}`;
}

module.exports = {
  timeTravel: async (_seconds) => {
    await ethers.provider.send('evm_increaseTime', [_seconds]);
    await ethers.provider.send('evm_mine');
  },
  generateRandomAirnodeWallet: () => {
    const airnodeWallet = ethers.Wallet.createRandom();
    const airnodeMnemonic = airnodeWallet.mnemonic.phrase;
    const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(airnodeMnemonic).derivePath("m/44'/60'/0'");
    const airnodeXpub = airnodeHdNode.neuter().extendedKey;
    return { airnodeAddress: airnodeWallet.address, airnodeMnemonic, airnodeXpub };
  },
  generateRandomAddress: () => {
    return ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
  },
  generateRandomBytes32: () => {
    return ethers.utils.hexlify(ethers.utils.randomBytes(32));
  },
  generateRandomBytes: () => {
    return ethers.utils.hexlify(ethers.utils.randomBytes(256));
  },
  deriveSponsorWalletAddress: (airnodeXpub, sponsorAddress) => {
    const hdNodeFromXpub = ethers.utils.HDNode.fromExtendedKey(airnodeXpub);
    const sponsorWalletHdNode = hdNodeFromXpub.derivePath(deriveWalletPathFromSponsorAddress(sponsorAddress));
    return sponsorWalletHdNode.address;
  },
  deriveSponsorWallet: (airnodeMnemonic, sponsorAddress) => {
    return ethers.Wallet.fromMnemonic(
      airnodeMnemonic,
      `m/44'/60'/0'/${deriveWalletPathFromSponsorAddress(sponsorAddress)}`
    );
  },
  deriveServiceId: (airnodeAddress, endpointId) => {
    return ethers.utils.keccak256(ethers.utils.solidityPack(['address', 'bytes32'], [airnodeAddress, endpointId]));
  },
  getCurrentTimestamp: async (provider) => {
    const currentBlockNumber = await provider.getBlockNumber();
    const currentBlock = await provider.getBlock(currentBlockNumber);
    return currentBlock.timestamp;
  },
  decodeRevertString: (callData) => {
    // Refer to https://ethereum.stackexchange.com/a/83577
    // Skip the signature, only get the revert string
    const goDecode = goSync(
      () => ethers.utils.defaultAbiCoder.decode(['string'], `0x${callData.substring(2 + 4 * 2)}`)[0]
    );
    if (!goDecode.success) return 'No revert string';

    return goDecode.data;
  },
};
