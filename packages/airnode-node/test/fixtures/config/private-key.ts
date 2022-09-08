import { ethers } from 'ethers';
import { buildNodeSettings } from './node-settings';

export const getAirnodeWalletPrivateKey = (mnemonic?: string) => {
  // Return the private key from the input mnemonic
  if (mnemonic) return ethers.Wallet.fromMnemonic(mnemonic).privateKey;

  // Otherwise return the private key of the default fixtures mnemonic
  const { airnodeWalletMnemonic } = buildNodeSettings();
  return ethers.Wallet.fromMnemonic(airnodeWalletMnemonic).privateKey;
};

export const getAirnodeWallet = (mnemonic?: string) => {
  // Return the wallet from the input mnemonic
  if (mnemonic) return ethers.Wallet.fromMnemonic(mnemonic);

  // Otherwise return the wallet of the default fixtures mnemonic
  const { airnodeWalletMnemonic } = buildNodeSettings();
  return ethers.Wallet.fromMnemonic(airnodeWalletMnemonic);
};
