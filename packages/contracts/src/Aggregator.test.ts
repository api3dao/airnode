const fs = require('fs');
const ganache = require('ganache-core');
const ethers = require('ethers');

describe('Aggregator', () => {
  let contract;
  beforeEach(async () => {
    const provider = new ethers.providers.Web3Provider(ganache.provider());
    const accounts = await provider.listAccounts();
    const signer = await provider.getSigner(0);
    const contractArtifact =       JSON.parse(fs.readFileSync('build/contracts/Aggregator.json', 'utf8'));
    const contractFactory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, signer);
    contract = await contractFactory.deploy('5', accounts.slice(1, 8));
  });
  it('should have the correct minResponses', async () => {
    const minResponses = (await contract.minResponses()).toString();
    expect(minResponses).toEqual('5');
  });
});
