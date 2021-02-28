import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export async function setProviderParameters(state: State): Promise<State> {
  for (const apiProviderName of Object.keys(state.apiProvidersByName)) {
    const configProvider = state.config.apiProviders[apiProviderName];
    const apiProvider = state.apiProvidersByName[apiProviderName];

    const authorizers = configProvider.authorizers.map((a) => state.authorizersByName[a]);

    const tx = await state.contracts
      .Airnode!.connect(apiProvider.signer)
      .setProviderParametersAndForwardFunds(configProvider.providerAdmin, apiProvider.xpub, authorizers, {
        value: ethers.utils.parseEther('1'),
      });

    await tx.wait();
  }
  return state;
}
