const AirnodeArtifact = require('./artifacts/contracts/Airnode.sol/Airnode.json');
const ConvenienceArtifact = require('./artifacts/contracts/Convenience.sol/Convenience.json');
const MockAirnodeClientArtifact = require('./artifacts/contracts/mock/MockAirnodeClient.sol/MockAirnodeClient.json');

const AirnodeRopsten = require('./deployments/ropsten/Airnode.json');
const ConvenienceRopsten = require('./deployments/ropsten/Convenience.json');

const AirnodeRinkeby = require('./deployments/rinkeby/Airnode.json');
const ConvenienceRinkeby = require('./deployments/rinkeby/Convenience.json');

const AirnodeAddresses = {
  3: AirnodeRopsten.receipt.contractAddress,
  4: AirnodeRinkeby.receipt.contractAddress,
};
const ConvenienceAddresses = {
  3: ConvenienceRopsten.receipt.contractAddress,
  4: ConvenienceRinkeby.receipt.contractAddress,
};

module.exports = {
  AirnodeArtifact,
  ConvenienceArtifact,
  AirnodeAddresses,
  ConvenienceAddresses,
  mocks: {
    MockAirnodeClient: MockAirnodeClientArtifact,
  },
  // TODO
  authorizers: {},
};
