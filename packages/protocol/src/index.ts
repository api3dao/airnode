import AirnodeRrpArtifact from '../artifacts/contracts/AirnodeRrp.sol/AirnodeRrp.json';
import MockAirnodeRrpClientArtifact from '../artifacts/contracts/mock/MockAirnodeRrpClient.sol/MockAirnodeRrpClient.json';
import {
  MockAirnodeRrpClient__factory as MockAirnodeRrpClientFactory,
  AirnodeRrp__factory as AirnodeRrpFactory,
} from './contracts';
import AirnodeRrpDeploymentRopsten from '../deployments/ropsten/AirnodeRrp.json';

const AirnodeRrpAddresses: { [chainId: number]: string } = { 3: AirnodeRrpDeploymentRopsten.receipt.contractAddress };
const mocks = {
  MockAirnodeRrpClientFactory,
};
// TODO:
const authorizers = {};

export { AirnodeRrpAddresses, AirnodeRrpFactory, mocks, authorizers };
// Export the artifacts for API consumers using web3
export { AirnodeRrpArtifact, MockAirnodeRrpClientArtifact };
export type { AirnodeRrp, MockAirnodeRrpClient } from './contracts';
