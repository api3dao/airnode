const fs = require('fs');
const ganache = require('ganache-core');
const ethers = require('ethers');

describe('Aggregator', () => {
  let contractFactory;
  let accounts;
  beforeEach(async () => {
    const provider = new ethers.providers.Web3Provider(ganache.provider());
    accounts = await provider.listAccounts();
    const signer = await provider.getSigner(0);
    const contractArtifact = JSON.parse(fs.readFileSync('build/contracts/Aggregator.json', 'utf8'));
    contractFactory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, signer);
  });
  it('should have the correct minResponses', async () => {
    const contract = await contractFactory.deploy(5, accounts.slice(1, 8), 0);
    const minResponses = (await contract.minResponses()).toString();
    expect(minResponses).toEqual('5');
  });
});
