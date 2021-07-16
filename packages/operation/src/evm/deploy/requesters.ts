import { encode } from '@api3/airnode-abi';
import { deriveEndpointId, deriveAirnodeId } from '../utils';
import { DeployState as State, Template } from '../../types';

export async function endorseClients(state: State): Promise<State> {
  const { AirnodeRrp } = state.contracts;

  for (const clientName of Object.keys(state.config.clients)) {
    const configClient = state.config.clients[clientName];
    const client = state.clientsByName[clientName];

    for (const requesterId of configClient.endorsers) {
      const requester = state.requestersById[requesterId];

      const tx = await AirnodeRrp!.connect(requester.signer).setClientEndorsementStatus(client.address, true);

      await tx.wait();
    }
  }

  return state;
}

export async function createTemplates(state: State): Promise<State> {
  const { AirnodeRrp } = state.contracts;

  const templatesByName: { [name: string]: Template } = {};
  for (const airnodeName of Object.keys(state.airnodesByName)) {
    const airnode = state.airnodesByName[airnodeName];
    const configAirnode = state.config.airnodes[airnodeName];
    const airnodeId = deriveAirnodeId(airnode.masterWalletAddress);

    for (const templateName of Object.keys(configAirnode.templates)) {
      const configTemplate = configAirnode.templates[templateName];
      const endpointId = deriveEndpointId(configTemplate.oisTitle, configTemplate.endpoint);

      const tx = await AirnodeRrp!.createTemplate(airnodeId, endpointId, encode(configTemplate.parameters));
      await tx.wait();

      const logs = await state.provider.getLogs({
        fromBlock: 0,
        address: AirnodeRrp!.address,
      });
      const log = logs.find((log) => log.transactionHash === tx.hash);
      const parsedLog = AirnodeRrp!.interface.parseLog(log!);
      const templateId = parsedLog.args.templateId;

      templatesByName[`${airnodeName}-${templateName}`] = {
        airnodeName,
        hash: templateId,
      };
    }
  }

  return { ...state, templatesByName };
}
