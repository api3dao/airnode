const AirnodeArtifact = require('./artifacts/contracts/Airnode.sol/Airnode.json');
const ConvenienceArtifact = require('./artifacts/contracts/Convenience.sol/Convenience.json');

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
  AirnodeAbi: AirnodeArtifact.abi,
  ConvenienceAbi: ConvenienceArtifact.abi,
  AirnodeAddresses,
  ConvenienceAddresses,
};
