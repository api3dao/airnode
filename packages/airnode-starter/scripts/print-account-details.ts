import { ethers } from 'ethers';
import { getUserWallet, runAndHandleErrors } from '../src';

const main = async () => {
  const wallet = await getUserWallet();
  const balance = await wallet.getBalance();

  console.log(
    `The account derived from the mnemonic has address: "${wallet.address}" and contains ${ethers.utils.formatEther(
      balance
    )} ETH`
  );
  if (balance.lt(ethers.utils.parseEther('0.3'))) {
    console.log('Please make sure your account has at least 0.3 ETH');
  }
};

runAndHandleErrors(main);
