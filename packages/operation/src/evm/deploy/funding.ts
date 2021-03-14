import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function fundAirnodeAccounts(state: State): Promise<State> {
  for (const airnodeName of Object.keys(state.airnodesByName)) {
    const airnode = state.airnodesByName[airnodeName];
    // Ensure that the Airnode address has enough ETH to set the onchain Airnode parameters
    const tx = await state.deployer.sendTransaction({
      to: airnode.masterWalletAddress,
      value: ethers.utils.parseEther('5'),
    });
    await tx.wait();
  }
  return state;
}

export async function fundRequesterAccounts(state: State): Promise<State> {
  for (const requesterId of Object.keys(state.requestersById)) {
    const requester = state.requestersById[requesterId];
    const tx = await state.deployer.sendTransaction({
      to: requester.address,
      value: ethers.utils.parseEther('2'),
    });
    await tx.wait();
  }
  return state;
}

export async function fundDesignatedWallets(state: State): Promise<State> {
  for (const configRequester of state.config.requesters) {
    const requester = state.requestersById[configRequester.id];
    for (const designatedWallet of requester.designatedWallets) {
      const ethAmount = configRequester.airnodes[designatedWallet.airnodeName].ethBalance;
      const tx = await state.deployer.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther(ethAmount),
      });
      await tx.wait();
    }
  }
  return state;
}
