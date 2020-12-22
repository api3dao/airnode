import { ethers } from 'ethers';
import { DeployState as State } from '../../types';

export function buildState(config: any): State {
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
