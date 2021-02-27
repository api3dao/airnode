import { encode } from '@airnode/airnode-abi';
import { deriveEndpointId, deriveProviderId } from '../utils';
import { DeployState as State, Template } from '../../types';

export async function endorseClients(state: State): Promise<State> {
  const { Airnode } = state.contracts;

  for (const clientName of Object.keys(state.config.clients)) {
    const configClient = state.config.clients[clientName];
    const client = state.clientsByName[clientName];

    for (const requesterId of configClient.endorsers) {
      const requester = state.requestersById[requesterId];

      const tx = await Airnode!
        .connect(requester.signer)
        .setClientEndorsementStatus(requester.requesterIndex, client.address, true);

      await tx.wait();
    }
  }

  return state;
}

export async function createTemplates(state: State): Promise<State> {
  const { Airnode } = state.contracts;

  const templatesByName: { [name: string]: Template } = {};
  for (const apiProviderName of Object.keys(state.apiProvidersByName)) {
    const apiProvider = state.apiProvidersByName[apiProviderName];
    const configApiProvider = state.config.apiProviders[apiProviderName];
    const providerId = deriveProviderId(apiProvider.masterWalletAddress);

    for (const templateName of Object.keys(configApiProvider.templates)) {
      const configTemplate = configApiProvider.templates[templateName];
      const endpointId = deriveEndpointId(configTemplate.oisTitle, configTemplate.endpoint);

      const tx = await Airnode!.createTemplate(providerId, endpointId, encode(configTemplate.parameters));
      await tx.wait();

      const logs = await state.provider.getLogs({
        fromBlock: 0,
        address: Airnode!.address,
      });
      const log = logs.find((log) => log.transactionHash === tx.hash);
      const parsedLog = Airnode!.interface.parseLog(log!);
      const templateId = parsedLog.args.templateId;

      templatesByName[`${apiProviderName}-${templateName}`] = {
        apiProviderName,
        hash: templateId,
      };
    }
  }

  return { ...state, templatesByName };
}
