const fs = require('fs');
const ganache = require('ganache-core');
const ethers = require('ethers');

describe('Aggregator', () => {
  let provider;
  let contractFactory;
  let accounts;
  // let aggregatorInterface;
  
  beforeEach(async () => {
    provider = new ethers.providers.Web3Provider(ganache.provider());
    accounts = await provider.listAccounts();
    const signer = await provider.getSigner(0);
    const contractArtifact = JSON.parse(fs.readFileSync('build/contracts/Aggregator.json', 'utf8'));
    contractFactory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, signer);
    // aggregatorInterface = new ethers.utils.Interface(contractArtifact.abi);
  });

  it('should have the correct minResponses', async () => {
    const contract = await contractFactory.deploy(5, accounts.slice(1, 8), 0);
    const minResponses = (await contract.minResponses()).toString();
    expect(minResponses).toEqual('5');
  });

  // Below tests left for reference
  /*it('should cost correct amount of gas for 7 oracles', async () => {
    const noOracles = 7;
    const oracles = accounts.slice(1, noOracles + 1);
    const responses = [7, 2, 1, 3, 6, 4, 5];
    const contract = await contractFactory.deploy(noOracles - 2, oracles, 0);
    for (const oracle of oracles) {
      await contract.updateRequesterStatus(oracle, true);
      await contract.updateOracleRequesterStatus(oracle, true);
    }
    let contractAsOracle = contract.connect(provider.getSigner(1));
    let tx = await contractAsOracle.createRequestAsOracle(responses[0]);
    let gasSpent = tx.gasLimit;
    const logs = await provider.getLogs({address: contractAsOracle.address});
    const log = (logs.filter(log => log.transactionHash === tx.hash))[0];
    const requestInd = aggregatorInterface.parseLog(log).args.requestInd;
    
    for (let indOracle = 1; indOracle < noOracles; indOracle++) {
      contractAsOracle = contract.connect(provider.getSigner(indOracle + 1));
      tx = await contractAsOracle.fulfill(requestInd, responses[indOracle]);
      gasSpent = gasSpent.add(tx.gasLimit);
    }
    console.log(`5/7: ${gasSpent.toString()}`);
    expect(gasSpent.toString()).toEqual("919703");
  });

  it('should cost correct amount of gas for 5 oracles', async () => {
    const noOracles = 5;
    const oracles = accounts.slice(1, noOracles + 1);
    const responses = [2, 1, 3, 4, 5];
    const contract = await contractFactory.deploy(noOracles - 2, oracles, 0);
    for (const oracle of oracles) {
      await contract.updateRequesterStatus(oracle, true);
      await contract.updateOracleRequesterStatus(oracle, true);
    }
    let contractAsOracle = contract.connect(provider.getSigner(1));
    let tx = await contractAsOracle.createRequestAsOracle(responses[0]);
    let gasSpent = tx.gasLimit;
    const logs = await provider.getLogs({address: contractAsOracle.address});
    const log = (logs.filter(log => log.transactionHash === tx.hash))[0];
    const requestInd = aggregatorInterface.parseLog(log).args.requestInd;
    
    for (let indOracle = 1; indOracle < noOracles; indOracle++) {
      contractAsOracle = contract.connect(provider.getSigner(indOracle + 1));
      tx = await contractAsOracle.fulfill(requestInd, responses[indOracle]);
      gasSpent = gasSpent.add(tx.gasLimit);
    }
    console.log(`3/5: ${gasSpent.toString()}`);
    expect(gasSpent.toString()).toEqual("705640");
  });

  it('should cost correct amount of gas for 3 oracles', async () => {
    const noOracles = 3;
    const oracles = accounts.slice(1, noOracles + 1);
    const responses = [2, 1, 3];
    const contract = await contractFactory.deploy(noOracles, oracles, 0);
    for (const oracle of oracles) {
      await contract.updateRequesterStatus(oracle, true);
      await contract.updateOracleRequesterStatus(oracle, true);
    }
    let contractAsOracle = contract.connect(provider.getSigner(1));
    let tx = await contractAsOracle.createRequestAsOracle(responses[0]);
    let gasSpent = tx.gasLimit;
    const logs = await provider.getLogs({address: contractAsOracle.address});
    const log = (logs.filter(log => log.transactionHash === tx.hash))[0];
    const requestInd = aggregatorInterface.parseLog(log).args.requestInd;
    
    for (let indOracle = 1; indOracle < noOracles; indOracle++) {
      contractAsOracle = contract.connect(provider.getSigner(indOracle + 1));
      tx = await contractAsOracle.fulfill(requestInd, responses[indOracle]);
      gasSpent = gasSpent.add(tx.gasLimit);
    }
    console.log(`3/3: ${gasSpent.toString()}`);
    expect(gasSpent.toString()).toEqual("433665");
  });*/
});
