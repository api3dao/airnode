import { ethers } from 'ethers';
import { deriveEndpointId } from '../utils';
import {
  Config,
  ConfigRequester,
  DeployState as State,
  DeployedAirnode,
  DeployedEndpoint,
  DeployedTemplate,
  Deployment,
} from '../../types';

export function buildDeployState(config: Config): State {
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
  const deployer = provider.getSigner(config.deployerIndex);

  return {
    airnodesByName: {},
    authorizersByName: {},
    clientsByName: {},
    config,
    contracts: {},
    deployer,
    provider,
    requestersById: {},
    templatesByName: {},
  };
}

function buildSaveableAirnode(state: State, airnodeName: string): DeployedAirnode {
  const configAirnode = state.config.airnodes[airnodeName];

  const endpointNames = Object.keys(configAirnode.endpoints);
  const endpoints = endpointNames.reduce((acc: any, name: string) => {
    const configEndpoint = configAirnode.endpoints[name];
    const endpointId = deriveEndpointId(configEndpoint.oisTitle, name);
    const data: DeployedEndpoint = { endpointId };
    return { ...acc, [name]: data };
  }, {});

  const templateNames = Object.keys(configAirnode.templates);
  const templates = templateNames.reduce((acc: any, name: string) => {
    const key = `${airnodeName}-${name}`;
    const configTemplate = configAirnode.templates[name];
    const template = state.templatesByName[key];
    const endpointId = deriveEndpointId(configTemplate.oisTitle, configTemplate.endpoint);
    const data: DeployedTemplate = { endpointId, hash: template.hash };
    return { ...acc, [name]: data };
  }, {});

  const airnode = state.airnodesByName[airnodeName];

  return {
    masterWalletAddress: airnode.masterWalletAddress,
    endpoints,
    templates,
  };
}

export function buildSaveableDeployment(state: State): Deployment {
  const contracts = {
    AirnodeRrp: state.contracts.AirnodeRrp!.address,
  };

  const clientNames = Object.keys(state.clientsByName);
  const clients = clientNames.reduce((acc: any, name: string) => {
    const client = state.clientsByName[name];
    return { ...acc, [name]: client.address };
  }, {});

  const requesters = state.config.requesters.reduce((acc: any, configRequester: ConfigRequester) => {
    const requester = state.requestersById[configRequester.id];
    const data = {
      address: requester.address,
      id: configRequester.id,
      privateKey: requester.signer.privateKey,
    };
    return [...acc, data];
  }, []);

  const airnodeNames = Object.keys(state.airnodesByName);
  const airnodes = airnodeNames.reduce((acc: any, name: string) => {
    const saveableAirnode = buildSaveableAirnode(state, name);
    return { ...acc, [name]: saveableAirnode };
  }, {});

  return {
    airnodes,
    contracts,
    clients,
    requesters,
  };
}
