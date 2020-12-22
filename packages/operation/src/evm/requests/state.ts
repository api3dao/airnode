import { ethers } from 'ethers';
import { Config, Deployment, RequestsState as State } from '../../types';

export function buildState(config: Config, deployment: Deployment): State {
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
  const deployer = provider.getSigner(0);

  return {
    config,
    deployment,
    deployer,
    provider,
  };
}
