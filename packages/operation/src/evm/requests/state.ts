import { ethers } from 'ethers';
import { AirnodeArtifact, ConvenienceArtifact } from '@airnode/protocol';
import { Config, Deployment, RequestsState as State } from '../../types';

export function buildRequestsState(config: Config, deployment: Deployment): State {
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
  const deployer = provider.getSigner(0);

  const Airnode = new ethers.Contract(deployment.contracts.Airnode, AirnodeArtifact.abi, provider);
  const Convenience = new ethers.Contract(deployment.contracts.Convenience, ConvenienceArtifact.abi, provider);

  return {
    config,
    contracts: {
      Airnode,
      Convenience,
    },
    deployment,
    deployer,
    provider,
  };
}
