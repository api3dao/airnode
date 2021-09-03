import * as ethers from 'ethers';
import * as logger from '../utils/logger';

export function validateMnemonic(mnemonic: string) {
  logger.debug('Validating mnemonic');
  try {
    ethers.Wallet.fromMnemonic(mnemonic);
  } catch {
    return false;
  }
  return true;
}

export function deriveMasterWalletAddress(mnemonic: string) {
  logger.debug('Deriving master wallet from mnemonic');
  const masterWallet = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return masterWallet.address;
}

export function deriveXpub(mnemonic: string) {
  logger.debug('Deriving xpub from mnemonic');
  const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  return hdNode.neuter().extendedKey;
}

export function generateMnemonic() {
  logger.debug('Generating new mnemonic');
  const masterWallet = ethers.Wallet.createRandom();
  return masterWallet.mnemonic.phrase;
}

export function shortenAirnodeAddress(airnodeAddress: string) {
  logger.debug('Shortening Airnode Address');
  if (!ethers.utils.isHexString(airnodeAddress, 32)) {
    throw new Error('airnodeAddress is not a valid hex string');
  }
  return airnodeAddress.substring(2, 9);
}
