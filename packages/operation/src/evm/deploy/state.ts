import { ethers } from 'ethers';
import { Config, DeployState as State, Deployment } from '../../types';

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

  const requesterIds = Object.keys(state.requestersById);
  const requesters = requesterIds.reduce((acc: any, id: string) => {
    const requester = state.requestersById[id];
    const data = {
      address: requester.address,
      privateKey: requester.signer.privateKey,
      requesterIndex: requester.requesterIndex.toString(),
    };
    return { ...acc, [id]: data };
  }, {});

  const templateNames = Object.keys(state.templatesByName);
  const templateByProvider = templateNames.reduce((acc: any, name: string) => {
    const template = state.templatesByName[name];
    const existingTemplates = acc[template.apiProviderName] || {};
    const updatedTemplates = { ...existingTemplates, [name]: template.hash };
    return { ...acc, [template.apiProviderName]: updatedTemplates };
  }, {});

  const apiProviderNames = Object.keys(state.apiProvidersByName);
  const apiProviders = apiProviderNames.reduce((acc: any, name: string) => {
    const apiProvider = state.apiProvidersByName[name];
    const templates = templateByProvider[name];
    const data = { address: apiProvider.address, templates };
    return { ...acc, [name]: data };
  }, {});

  return {
    apiProviders,
    contracts,
    clients,
    requesters,
  };
}
