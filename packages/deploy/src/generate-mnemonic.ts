import * as ethers from 'ethers';

function generateMnemonic(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic.phrase;
}

console.log(generateMnemonic());
