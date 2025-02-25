import { ethers } from 'ethers';
import {
  Config,
  ConfigSponsor,
  DeployedAirnode,
  DeployedEndpoint,
  DeployedSponsor,
  DeployedTemplate,
  Deployment,
  DeployState as State,
} from '../../types';
import { deriveEndpointId } from '../utils';

export function buildDeployState(config: Config): State {
  const provider = new ethers.providers.JsonRpcProvider({
    url: 'http://127.0.0.1:8545/',
    headers: {
      // The default behavior of keep-alive changed from Node.js v18 to v20, so we need to disable it for e2e tests
      Connection: 'close',
    },
  });

  const deployer = provider.getSigner(config.deployerIndex);

  return {
    airnodesByName: {},
    authorizersByName: {},
    requestersByName: {},
    config,
    contracts: {},
    deployer,
    provider,
    sponsorsById: {},
    templatesByName: {},
    erc721sByName: {},
    authorizers: {},
  };
}

function buildSaveableAirnode(state: State, airnodeName: string): DeployedAirnode {
  const configAirnode = state.config.airnodes[airnodeName];

  const endpointNames = Object.keys(configAirnode.endpoints);
  const endpoints: { [name: string]: DeployedEndpoint } = endpointNames.reduce((acc: any, name: string) => {
    const configEndpoint = configAirnode.endpoints[name];
    const endpointId = deriveEndpointId(configEndpoint.oisTitle, name);
    const data: DeployedEndpoint = { endpointId };
    return { ...acc, [name]: data };
  }, {});

  const templateNames = Object.keys(configAirnode.templates);
  const templates: { [name: string]: DeployedTemplate } = templateNames.reduce((acc: any, name: string) => {
    const key = `${airnodeName}-${name}`;
    const configTemplate = configAirnode.templates[name];
    const template = state.templatesByName[key];
    const endpointId = deriveEndpointId(configTemplate.oisTitle, configTemplate.endpoint);
    const data: DeployedTemplate = { endpointId, hash: template.hash };
    return { ...acc, [name]: data };
  }, {});

  const airnode = state.airnodesByName[airnodeName];

  return {
    airnodeWalletAddress: airnode.airnodeWalletAddress,
    endpoints,
    templates,
  };
}

export function buildSaveableDeployment(state: State): Deployment {
  const contracts = {
    AirnodeRrp: state.contracts.AirnodeRrp!.address,
    RequesterAuthorizerWithErc721: state.contracts.RequesterAuthorizerWithErc721!.address,
  };

  const requesterNames = Object.keys(state.requestersByName);
  const requesters: { [name: string]: string } = requesterNames.reduce((acc: any, name: string) => {
    const requester = state.requestersByName[name];
    return { ...acc, [name]: requester.address };
  }, {});

  const erc721Names = Object.keys(state.erc721sByName);
  const erc721s: { [name: string]: string } = erc721Names.reduce((acc: any, name: string) => {
    const erc721 = state.erc721sByName[name];
    return { ...acc, [name]: erc721.address };
  }, {});

  const sponsors: DeployedSponsor[] = state.config.sponsors.reduce((acc: any, configRequester: ConfigSponsor) => {
    const sponsor = state.sponsorsById[configRequester.id];
    const data = {
      address: sponsor.address,
      id: configRequester.id,
      privateKey: sponsor.signer.privateKey,
    };
    return [...acc, data];
  }, []);

  const airnodeNames = Object.keys(state.airnodesByName);
  const airnodes: { [name: string]: DeployedAirnode } = airnodeNames.reduce((acc: any, name: string) => {
    const saveableAirnode = buildSaveableAirnode(state, name);
    return { ...acc, [name]: saveableAirnode };
  }, {});

  return {
    airnodes,
    contracts,
    requesters,
    sponsors,
    erc721s,
    authorizers: state.authorizersByName,
  };
}
