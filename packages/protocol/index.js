const AirnodeArtifact = require('./artifacts/contracts/Airnode.sol/Airnode.json');
const ConvenienceArtifact = require('./artifacts/contracts/Convenience.sol/Convenience.json');
const MockAirnodeClientArtifact = require('./artifacts/contracts/mock/MockAirnodeClient.sol/MockAirnodeClient.json');

const networkChainIds = { ropsten: 3, rinkeby: 4 };

const AirnodeAddresses = {};
const ConvenienceAddresses = {};
for (const network in networkChainIds) {
  const AirnodeDeployment = require(`./deployments/${network}/Airnode.json`);
  AirnodeAddresses[networkChainIds[network]] = AirnodeDeployment.receipt.contractAddress;
  const ConvenienceDeployment = require(`./deployments/${network}/Convenience.json`);
  ConvenienceAddresses[networkChainIds[network]] = ConvenienceDeployment.receipt.contractAddress;
}

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
