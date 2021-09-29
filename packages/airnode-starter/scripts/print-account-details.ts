import { ethers } from 'ethers';
import { getUserWallet, runAndHandleErrors } from '../src';

const main = async () => {
  const wallet = await getUserWallet();
  const balance = ethers.utils.formatEther(await wallet.getBalance());
  console.log(`The account derived from the mnemonic has address: "${wallet.address}" and contains "${balance}" ETH`);
};

runAndHandleErrors(main);
