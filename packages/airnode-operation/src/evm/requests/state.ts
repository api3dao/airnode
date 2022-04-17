import { ethers } from 'ethers';
import { AirnodeRrpV0Factory } from '@api3/airnode-protocol';
import { Config, Deployment, RequestsState as State } from '../../types';

export function buildRequestsState(config: Config, deployment: Deployment): State {
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
  const deployer = provider.getSigner(config.deployerIndex);

  const AirnodeRrp = AirnodeRrpV0Factory.connect(deployment.contracts.AirnodeRrp, provider);

  return {
    config,
    contracts: {
      AirnodeRrp,
    },
    deployment,
    deployer,
    provider,
  };
}
