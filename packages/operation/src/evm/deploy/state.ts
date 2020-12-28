import { ethers } from 'ethers';
import { deriveEndpointId } from '../utils';
import {
  Config,
  ConfigRequester,
  DeployState as State,
  DeployedAPIProvider,
  DeployedEndpoint,
  DeployedTemplate,
  Deployment,
} from '../../types';

export function buildDeployState(config: Config): State {
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
  const deployer = provider.getSigner(0);

  return {
    apiProvidersByName: {},
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

function buildSaveableAPIProvider(state: State, apiProviderName: string): DeployedAPIProvider {
  const configApiProvider = state.config.apiProviders[apiProviderName];

  const endpointNames = Object.keys(configApiProvider.endpoints);
  const endpoints = endpointNames.reduce((acc: any, name: string) => {
    const configEndpoint = configApiProvider.endpoints[name];
    const endpointId = deriveEndpointId(configEndpoint.oisTitle, name);
    const data: DeployedEndpoint = { endpointId };
    return { ...acc, [name]: data };
  }, {});

  const templateNames = Object.keys(configApiProvider.templates);
  const templates = templateNames.reduce((acc: any, name: string) => {
    const key = `${apiProviderName}-${name}`;
    const configTemplate = configApiProvider.templates[name];
    const template = state.templatesByName[key];
    const endpointId = deriveEndpointId(configTemplate.oisTitle, configTemplate.endpoint);
    const data: DeployedTemplate = { endpointId, hash: template.hash };
    return { ...acc, [name]: data };
  }, {});

  const apiProvider = state.apiProvidersByName[apiProviderName];

  return {
    address: apiProvider.address,
    endpoints,
    templates,
  };
}

export function buildSaveableDeployment(state: State): Deployment {
  const contracts = {
    Airnode: state.contracts.Airnode!.address,
    Convenience: state.contracts.Convenience!.address,
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
      requesterIndex: requester.requesterIndex.toString(),
    };
    return [...acc, data];
  }, []);

  const apiProviderNames = Object.keys(state.apiProvidersByName);
  const apiProviders = apiProviderNames.reduce((acc: any, name: string) => {
    const saveableApiProvider = buildSaveableAPIProvider(state, name);
    return { ...acc, [name]: saveableApiProvider };
  }, {});

  return {
    apiProviders,
    contracts,
    clients,
    requesters,
  };
}
