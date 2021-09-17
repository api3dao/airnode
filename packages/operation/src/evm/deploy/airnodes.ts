import { DeployState as State } from '../../types';

export async function setAirnodeXpub(state: State): Promise<State> {
  for (const airnodeName of Object.keys(state.airnodesByName)) {
    const airnode = state.airnodesByName[airnodeName];

    const tx = await state.contracts.AirnodeRrp!.connect(airnode.signer).setAirnodeXpub(airnode.xpub);

    await tx.wait();
  }
  return state;
}
