const AirnodeArtifact = require('./artifacts/contracts/Airnode.sol/Airnode.json');
const MockAirnodeClientArtifact = require('./artifacts/contracts/mock/MockAirnodeClient.sol/MockAirnodeClient.json');

const AirnodeRopsten = require('./deployments/ropsten/Airnode.json');

const AirnodeRinkeby = require('./deployments/rinkeby/Airnode.json');

const AirnodeGoerli = require('./deployments/goerli/Airnode.json');

const AirnodeXdai = require('./deployments/xdai/Airnode.json');

const AirnodeFantom = require('./deployments/fantom/Airnode.json');

const AirnodeAddresses = {
  3: AirnodeRopsten.receipt.contractAddress,
  4: AirnodeRinkeby.receipt.contractAddress,
  5: AirnodeGoerli.receipt.contractAddress,
  100: AirnodeXdai.receipt.contractAddress,
  250: AirnodeFantom.receipt.contractAddress,
};

module.exports = {
  AirnodeArtifact,
  AirnodeAddresses,
  mocks: {
    MockAirnodeClient: MockAirnodeClientArtifact,
  },
  // TODO
  authorizers: {},
};
