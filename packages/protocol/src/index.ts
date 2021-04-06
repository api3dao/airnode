import AirnodeRrpArtifact from '../artifacts/contracts/AirnodeRrp.sol/AirnodeRrp.json';
import MockAirnodeRrpClientArtifact from '../artifacts/contracts/mock/MockAirnodeRrpClient.sol/MockAirnodeRrpClient.json';

const AirnodeRrpAddresses: { [chainId: number]: string } = {};
const mocks = {
  MockAirnodeRrpClient: MockAirnodeRrpClientArtifact,
};
// TODO
const authorizers = {};

export { AirnodeRrpArtifact, AirnodeRrpAddresses, mocks, authorizers };
