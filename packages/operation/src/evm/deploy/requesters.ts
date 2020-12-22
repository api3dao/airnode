import { ethers } from 'ethers';
import { encode } from '@airnode/airnode-abi';
import { deriveProviderId } from '../utils';
import { DeployState as State, Template } from '../../types';

export async function endorseClients(state: State): Promise<State> {
  const { Airnode } = state.contracts;

  for (const clientName of Object.keys(state.config.clients)) {
    const configClient = state.config.clients[clientName];
    const client = state.clientsByName[clientName];

    for (const requesterId of configClient.endorsers) {
      const requester = state.requestersById[requesterId];

      await Airnode!
        .connect(requester.signer)
        .updateClientEndorsementStatus(requester.requesterIndex, client.address, true);
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
    const providerId = deriveProviderId(apiProvider);

    for (const templateName of Object.keys(configApiProvider.templates)) {
      const configTemplate = configApiProvider.templates[templateName];
      const client = state.clientsByName[configTemplate.fulfillClient];
      const requester = state.requestersById[configTemplate.requester];
      const designatedWallet = requester.designatedWallets.find((w) => w.apiProviderName === apiProviderName);

      const { keccak256, defaultAbiCoder } = ethers.utils;
      const endpointId = keccak256(defaultAbiCoder.encode(['string'], [configTemplate.endpoint]));

      const tx = await Airnode!.createTemplate(
        providerId,
        endpointId,
        requester.requesterIndex,
        designatedWallet!.address,
        client.address,
        client.interface.getSighash('fulfill(bytes32,uint256,bytes32)'),
        encode(configTemplate.parameters)
      );

      const logs = await state.provider.getLogs({ address: Airnode!.address });
      const log = logs.find((log) => log.transactionHash === tx.hash);
      const parsedLog = Airnode!.interface.parseLog(log!);
      const templateId = parsedLog.args.templateId;

      templatesByName[templateName] = {
        apiProviderName,
        hash: templateId,
      };
    }
  }

  return { ...state, templatesByName };
}
