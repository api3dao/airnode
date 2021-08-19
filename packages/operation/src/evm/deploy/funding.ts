import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function fundAirnodeAccounts(state: State): Promise<State> {
  for (const airnodeName of Object.keys(state.airnodesByName)) {
    const airnode = state.airnodesByName[airnodeName];
    // This step is optional and only needed if we want to store the airnode wallet xpub on-chain
    const tx = await state.deployer.sendTransaction({
      to: airnode.airnodeWalletAddress,
      value: ethers.utils.parseEther('5'),
    });
    await tx.wait();
  }
  return state;
}

export async function fundSponsorAccounts(state: State): Promise<State> {
  for (const sponsorId of Object.keys(state.sponsorsById)) {
    const sponsor = state.sponsorsById[sponsorId];
    const tx = await state.deployer.sendTransaction({
      to: sponsor.address,
      value: ethers.utils.parseEther('2'),
    });
    await tx.wait();
  }
  return state;
}

export async function fundDesignatedWallets(state: State): Promise<State> {
  for (const configSponsor of state.config.sponsors) {
    const sponsor = state.sponsorsById[configSponsor.id];
    for (const designatedWallet of sponsor.designatedWallets) {
      const ethAmount = configSponsor.airnodes[designatedWallet.airnodeName].ethBalance;
      const tx = await state.deployer.sendTransaction({
        to: designatedWallet.address,
        value: ethers.utils.parseEther(ethAmount),
      });
      await tx.wait();
    }
  }
  return state;
}
