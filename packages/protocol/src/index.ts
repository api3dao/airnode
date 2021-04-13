import AirnodeRrpArtifact from '../artifacts/contracts/AirnodeRrp.sol/AirnodeRrp.json';
import {
  MockAirnodeRrpClient__factory as MockAirnodeRrpClientFactory,
  AirnodeRrp__factory as AirnodeRrpFactory,
} from './contracts';

const AirnodeRrpAddresses: { [chainId: number]: string } = {};
const mocks = {
  MockAirnodeRrpClientFactory,
};
// TODO:
const authorizers = {};
// TODO: refactor once https://github.com/ethereum-ts/TypeChain/pull/368 is merged
const AirnodeRrpArtifactAbi = AirnodeRrpArtifact.abi;

export { AirnodeRrpAddresses, AirnodeRrpFactory, mocks, authorizers, AirnodeRrpArtifactAbi };
export type { AirnodeRrp, MockAirnodeRrpClient } from './contracts';
