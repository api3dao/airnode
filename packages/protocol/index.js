const AirnodeArtifact = require('./artifacts/contracts/Airnode.sol/Airnode.json');
const ConvenienceArtifact = require('./artifacts/contracts/Convenience.sol/Convenience.json');
const MockAirnodeClientArtifact = require('./artifacts/contracts/mock/MockAirnodeClient.sol/MockAirnodeClient.json');

const AirnodeAddresses = {};
const ConvenienceAddresses = {};
let AirnodeDeployment, ConvenienceDeployment;
// Ropsten - 3
AirnodeDeployment = require(`./deployments/ropsten/Airnode.json`);
AirnodeAddresses[3] = AirnodeDeployment.receipt.contractAddress;
ConvenienceDeployment = require(`./deployments/ropsten/Convenience.json`);
ConvenienceAddresses[3] = ConvenienceDeployment.receipt.contractAddress;
// Rinkeby - 4
AirnodeDeployment = require(`./deployments/rinkeby/Airnode.json`);
AirnodeAddresses[4] = AirnodeDeployment.receipt.contractAddress;
ConvenienceDeployment = require(`./deployments/rinkeby/Convenience.json`);
ConvenienceAddresses[4] = ConvenienceDeployment.receipt.contractAddress;

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
