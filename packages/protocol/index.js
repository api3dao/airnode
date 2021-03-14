const AirnodeRrpArtifact = require('./artifacts/contracts/AirnodeRrp.sol/AirnodeRrp.json');
const MockAirnodeRrpClientArtifact = require('./artifacts/contracts/mock/MockAirnodeRrpClient.sol/MockAirnodeRrpClient.json');

const AirnodeRrpAddresses = {};

module.exports = {
  AirnodeRrpArtifact,
  AirnodeRrpAddresses,
  mocks: {
    MockAirnodeRrpClient: MockAirnodeRrpClientArtifact,
  },
  // TODO
  authorizers: {},
};
