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

export function deriveAirnodeId(mnemonic: string) {
  logger.debug('Deriving Airnode ID from mnemonic');
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(['address'], [deriveMasterWalletAddress(mnemonic)])
  );
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

export function shortenAirnodeId(airnodeId: string) {
  logger.debug('Shortening Airnode ID');
  if (!ethers.utils.isHexString(airnodeId, 32)) {
    throw new Error('airnodeId is not a valid hex string');
  }
  return airnodeId.substring(2, 9);
}
