import { encode } from '@api3/airnode-abi';
import { deriveEndpointId } from '../utils';
import { DeployState as State, Template } from '../../types';

export async function sponsorRequesters(state: State): Promise<State> {
  const { AirnodeRrp } = state.contracts;

  for (const requesterName of Object.keys(state.config.requesters)) {
    const configRequester = state.config.requesters[requesterName];
    const requester = state.requestersByName[requesterName];

    for (const sponsorId of configRequester.sponsors) {
      const sponsor = state.sponsorsById[sponsorId];

      const tx = await AirnodeRrp!.connect(sponsor.signer).setSponsorshipStatus(requester.address, true);

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

    for (const templateName of Object.keys(configAirnode.templates)) {
      const configTemplate = configAirnode.templates[templateName];
      const endpointId = deriveEndpointId(configTemplate.oisTitle, configTemplate.endpoint);

      const tx = await AirnodeRrp!.createTemplate(
        airnode.airnodeWalletAddress,
        endpointId,
        encode(configTemplate.parameters)
      );
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
