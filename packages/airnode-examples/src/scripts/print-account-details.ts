import { ethers } from 'ethers';
import { cliPrint, getUserWallet, runAndHandleErrors } from '../';

const main = async () => {
  const wallet = await getUserWallet();
  const balance = await wallet.getBalance();

  cliPrint.info(
    `The account derived from the mnemonic has address: "${wallet.address}" and contains ${ethers.utils.formatEther(
      balance
    )} ETH`
  );
  if (balance.lt(ethers.utils.parseEther('0.3'))) {
    cliPrint.warning('Please make sure your account has at least 0.3 ETH');
  }
};

runAndHandleErrors(main);
