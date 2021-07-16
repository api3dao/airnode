import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function setAirnodeParameters(state: State): Promise<State> {
  for (const airnodeName of Object.keys(state.airnodesByName)) {
    const configAirnode = state.config.airnodes[airnodeName];
    const airnode = state.airnodesByName[airnodeName];

    const authorizers = configAirnode.authorizers.map((a) => state.authorizersByName[a]);

    const tx = await state.contracts
      .AirnodeRrp!.connect(airnode.signer)
      .setAirnodeParameters(airnode.xpub, authorizers, {
        value: ethers.utils.parseEther('1'),
      });

    await tx.wait();
  }
  return state;
}
