const fs = require('fs');
const ganache = require('ganache-core');
const ethers = require('ethers');

describe('Full user flow', () => {
  let ethProvider;
  let contractFactory;
  let clientContractFactory;
  let accounts;
  let requesterInterface;

  beforeEach(async () => {
    ethProvider = new ethers.providers.Web3Provider(ganache.provider());
    accounts = await ethProvider.listAccounts();
    const signer = await ethProvider.getSigner(0);
    const contractArtifact = JSON.parse(fs.readFileSync('build/contracts/ChainApi.json', 'utf8'));
    contractFactory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, signer);
    requesterInterface = new ethers.utils.Interface(contractArtifact.abi);
    const clientContractArtifact = JSON.parse(fs.readFileSync('build/contracts/Client.json', 'utf8'));
    clientContractFactory = new ethers.ContractFactory(
      clientContractArtifact.abi,
      clientContractArtifact.bytecode,
      signer
    );
  });

  it('works', async () => {
    // The contract deployer doesn't have any special powers
    // so it doesn't matter who deployed the contract (in this case, it's platformAgent)
    const contract = await contractFactory.deploy();
    let tx, logs, log;

    // ~~~~~ Roles ~~~~~
    const platformAgent = accounts[0];
    const contractAsPlatformAgent = contract.connect(ethProvider.getSigner(0));
    const providerAdmin = accounts[1];
    const contractAsProviderAdmin = contract.connect(ethProvider.getSigner(1));
    const requesterAdmin = accounts[2];
    const requesterSigner = ethProvider.getSigner(2);
    const contractAsRequesterAdmin = contract.connect(ethProvider.getSigner(2));
    // ~~~~~ Roles ~~~~~

    // The provider signs up to ChainAPI. The dapp has the provider make the transaction below.
    // The API subscribed for a month
    let validUntilDate = new Date();
    validUntilDate.setMonth(validUntilDate.getMonth() + 1);
    let validUntilTimestamp = (validUntilDate.getTime() / 1000) | 0;
    tx = await contractAsProviderAdmin.createProvider(providerAdmin, platformAgent, validUntilTimestamp);

    // ChainAPI checks that providerAdmin, platformAgent and validUntilTimestamp are correct
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const providerId = requesterInterface.parseLog(log).args.id;
    let provider = await contract.getProvider(providerId);
    // If any of these assertions fail, we don't accept the providerId at the ChainAPI end
    expect(provider.admin).toEqual(providerAdmin);
    expect(provider.platformAgent).toEqual(platformAgent);
    expect(provider.validUntil.toString()).toEqual(validUntilTimestamp.toString());

    // The provider decided to extend their subscription for 2 months
    // They pay ChainAPI and ChainAPI makes this transaction
    validUntilDate = new Date(provider.validUntil * 1000);
    validUntilDate.setMonth(validUntilDate.getMonth() + 2);
    validUntilTimestamp = (validUntilDate.getTime() / 1000) | 0;
    await contractAsPlatformAgent.extendProviderValidityDeadline(providerId, validUntilTimestamp);

    // Provider defines the OIS that integrates their API to their node using ChainAPI GUI

    // Provider creates an endpoint with no authorizers (i.e., it's publicly accessible)
    // using the ChainAPI dapp
    tx = await contractAsProviderAdmin.createEndpoint(providerId, []);
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const endpointId = requesterInterface.parseLog(log).args.id;

    // Provider creates a specs.json file using the ChainAPI GUI
    // where this endpointId is mapped to an oracle endpoint

    // Provider deploys their node, receives its public key and updates ProviderStore
    const providerWallet = ethers.Wallet.createRandom();
    // Store providerWallet.privateKey in AWS Secrets Manager
    // Do we want to give the provider providerWallet.mnemonic.phrase?
    // Do we want the user to be able to deploy a node with mnemonics?
    const providerHDNode = ethers.utils.HDNode.fromMnemonic(providerWallet.mnemonic.phrase);
    const providerXpub = providerHDNode.neuter().extendedKey;
    await contractAsProviderAdmin.updateProviderXpub(providerId, providerXpub);

    // The requester signs up to ChainAPI. The dapp has the provider make the transaction below.
    tx = await contractAsRequesterAdmin.createRequester(requesterAdmin);
    // ChainAPI checks that providerAdmin, platformAgent and validUntilTimestamp are correct
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const requesterId = requesterInterface.parseLog(log).args.id;
    const requester = await contract.getRequester(requesterId);
    // If any of these assertions fail, we don't accept the requesterId at the ChainAPI end
    expect(requester).toEqual(requesterAdmin);

    // The requester asks to get a wallet allocated through the ChainAPI dapp
    tx = await contractAsRequesterAdmin.allocateWallet(providerId, requesterId);
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    // Maybe this should be allowed only if provider xpub is set
    const walletInd = requesterInterface.parseLog(log).args.walletInd;
    // The requester derives the address of the wallet it got allocated
    provider = await contract.getProvider(providerId);
    const requesterHDNode = ethers.utils.HDNode.fromExtendedKey(provider.xpub);
    const allocatedWallet = requesterHDNode.derivePath(`m/0/${walletInd}`); // for example
    let allocatedWalletBalance = await ethProvider.getBalance(allocatedWallet.address);
    // It's empty
    expect(allocatedWalletBalance.toString()).toEqual('0');
    // Requester funds it
    await requesterSigner.sendTransaction({
      to: allocatedWallet.address,
      value: ethers.utils.parseEther('1'),
    });

    // IMPORTANT: We need to have the provider enable that wallet somehow
    // Alternatively, the requester may request this specific wallet to respond to its request
    await contractAsProviderAdmin.updateProviderWalletStatus(providerId, allocatedWallet.address, true);

    // Requester deploys their client contract and marks it as theirs
    const clientContract = await clientContractFactory.deploy(requesterId);

    // Requester associates their contract with their ID
    await contractAsRequesterAdmin.updateContractRequesterId(requesterId, clientContract.address);

    // Requester creates a request template for the provider endpoint using the ChainAPI dapp
    tx = await contractAsRequesterAdmin.createTemplate(
      providerId,
      endpointId,
      ethers.BigNumber.from('500000'),
      '0x12341234'
    );
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const templateId = requesterInterface.parseLog(log).args.id;

    // Requester client contract makes the request using the templateId
    tx = await clientContract.request(contract.address, providerId, templateId);
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    // const requestId = requesterInterface.parseLog(log).args.requestId;

    // Provider was listening for events from ChainApi with its providerId
    // and heard the log above. It first derives the wallet for the requester.
    const requesterAddress = await requesterInterface.parseLog(log).args.requester;
    const walletIndFromEvent = await contract.getWalletWithRequesterAddress(providerId, requesterAddress);
    // Does the requester have a wallet allocated?
    expect(walletIndFromEvent.toString()).not.toEqual('0');
    // Fetch the mnemonics from Secrets Manager and derive their wallet
    const providerHDNodeAtRuntime = ethers.utils.HDNode.fromMnemonic(providerWallet.mnemonic.phrase);
    const allocatedWalletNodeAtRuntime = providerHDNodeAtRuntime.derivePath(`m/0/${walletInd}`);
    const allocatedWalletAtRuntime = new ethers.Wallet(allocatedWalletNodeAtRuntime.privateKey, ethProvider);
    // Probably check the wallet balance here
    allocatedWalletBalance = await ethProvider.getBalance(allocatedWalletAtRuntime.address);
    expect(allocatedWalletBalance.toString()).not.toEqual('0');
    // Fulfill the request with the wallet
    const contractAsAllocatedWallet = contract.connect(allocatedWalletAtRuntime);
    await contractAsAllocatedWallet.fulfillRequest(
      requesterInterface.parseLog(log).args.callbackAddress,
      requesterInterface.parseLog(log).args.callbackFunctionId,
      requesterInterface.parseLog(log).args.requestId,
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      {
        gasLimit: '500000',
      }
    );

    // We got our response!
    const data = await clientContract.data();
    expect(data.toString()).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001');

    // The requester wants their money back now
    tx = await contractAsRequesterAdmin.emptyWallet(providerId, requesterId, requesterAdmin);
    // The node is listening for this
    logs = await ethProvider.getLogs({ address: contract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    // TODO: Get balance, estimate transaction gas, send everything
    // Alternatively, we can send the transaction to ProviderStore to be redirected to the requester
    // That would emit an event, which help tell node if he was able to fulfill past WalletEmpty requests
  });
});
