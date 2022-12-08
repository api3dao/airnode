import * as ethers from 'ethers';
import * as logger from '../utils/logger';

export function deriveAirnodeAddress(mnemonic: string) {
  logger.debug('Deriving airnode wallet from mnemonic');
  const airnodeWallet = ethers.Wallet.fromMnemonic(mnemonic);
  return airnodeWallet.address;
}

export function deriveAirnodeXpub(mnemonic: string) {
  logger.debug('Deriving Airnode xpub from mnemonic');
  const airnodeHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic).derivePath("m/44'/60'/0'");
  return airnodeHdNode.neuter().extendedKey;
}
