const fs = require('fs');
const ganache = require('ganache-core');
const ethers = require('ethers');

describe('Full user flow', () => {
  let ethProvider;
  let chainApiContractFactory;
  let clientContractFactory;
  let accounts;
  let chainApiInterface;

  beforeEach(async () => {
    ethProvider = new ethers.providers.Web3Provider(ganache.provider());
    accounts = await ethProvider.listAccounts();
    const signer = await ethProvider.getSigner(0);
    const chainApiContractArtifact = JSON.parse(fs.readFileSync('build/contracts/ChainApi.json', 'utf8'));
    chainApiContractFactory = new ethers.ContractFactory(
      chainApiContractArtifact.abi,
      chainApiContractArtifact.bytecode,
      signer
    );
    chainApiInterface = new ethers.utils.Interface(chainApiContractArtifact.abi);
    const clientContractArtifact = JSON.parse(fs.readFileSync('build/contracts/ExampleClient.json', 'utf8'));
    clientContractFactory = new ethers.ContractFactory(
      clientContractArtifact.abi,
      clientContractArtifact.bytecode,
      signer
    );
  });

  it('works', async () => {
    // The contract deployer doesn't have any special powers
    // so it doesn't matter who deployed the contract (in this case, it's platformAgent)
    const chainApiContract = await chainApiContractFactory.deploy();
    let tx, logs, log;

    // ~~~~~ Roles ~~~~~
    const platformAgent = accounts[0];
    const providerAdmin = accounts[1];
    const chainApiContractAsProviderAdmin = chainApiContract.connect(ethProvider.getSigner(1));
    const requesterAdmin = accounts[2];
    const requesterSigner = ethProvider.getSigner(2);
    const chainApiContractAsRequesterAdmin = chainApiContract.connect(ethProvider.getSigner(2));
    // ~~~~~ Roles ~~~~~

    // The provider signs up to ChainAPI. The dapp has the provider make the transaction below.
    // The provider has subscribed for a month. The provider requires a minimum 0.05 ETH deposit
    // for a requester to reserve a wallet.
    const validUntilDate = new Date();
    validUntilDate.setMonth(validUntilDate.getMonth() + 1);
    const validUntilTimestamp = (validUntilDate.getTime() / 1000) | 0;
    const authorizationDeposit = ethers.utils.parseEther('0.05');
    tx = await chainApiContractAsProviderAdmin.createProvider(
      providerAdmin,
      platformAgent,
      validUntilTimestamp,
      authorizationDeposit
    );
    logs = await ethProvider.getLogs({ address: chainApiContract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const providerId = chainApiInterface.parseLog(log).args.id;

    // Provider defines the OIS that integrates their API to their node using ChainAPI GUI

    // Provider creates an endpoint with no authorizers (i.e., it's publicly accessible)
    // using the ChainAPI dapp
    tx = await chainApiContractAsProviderAdmin.createEndpoint(providerId, []);
    logs = await ethProvider.getLogs({ address: chainApiContract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const endpointId = chainApiInterface.parseLog(log).args.id;

    // Provider creates a specs.json file using the ChainAPI GUI
    // where this endpointId is mapped to an oracle endpoint

    // Provider deploys their node, receives its public key and updates ProviderStore
    const providerWallet = ethers.Wallet.createRandom();
    // Store providerWallet.privateKey in AWS Secrets Manager
    // Do we want to give the provider providerWallet.mnemonic.phrase?
    // Do we want the user to be able to deploy a node with mnemonics?
    const providerHDNode = ethers.utils.HDNode.fromMnemonic(providerWallet.mnemonic.phrase);
    const providerXpub = providerHDNode.neuter().extendedKey;
    const authorizerWallet = providerHDNode.derivePath(`m/0/0`);
    await chainApiContractAsProviderAdmin.initializeProviderKeys(providerId, providerXpub, authorizerWallet.address);

    // The requester signs up to ChainAPI. The dapp has the requester make the transaction below.
    tx = await chainApiContractAsRequesterAdmin.createRequester(requesterAdmin);
    logs = await ethProvider.getLogs({ address: chainApiContractAsRequesterAdmin.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const requesterId = chainApiInterface.parseLog(log).args.id;

    // The requester asks to get a wallet allocated through the ChainAPI dapp
    tx = await chainApiContractAsRequesterAdmin.reserveWallet(providerId, requesterId, { value: authorizationDeposit });
    logs = await ethProvider.getLogs({ address: chainApiContractAsRequesterAdmin.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const walletInd = chainApiInterface.parseLog(log).args.walletInd;
    const requesterHDNode = ethers.utils.HDNode.fromExtendedKey(providerXpub);
    const reservedWallet = requesterHDNode.derivePath(`m/0/${walletInd}`);
    // The provider received authorizationDeposit at their authorizerWallet
    const walletAuthorizerBalance = await ethProvider.getBalance(authorizerWallet.address);
    expect(walletAuthorizerBalance.toString()).toEqual(authorizationDeposit.toString());
    // Now it will use that to authorize the reserved wallet to fulfill requests
    const providerHDNodeAtRuntime = ethers.utils.HDNode.fromMnemonic(providerWallet.mnemonic.phrase);
    const authorizerWalletNodeDerivedAgain = providerHDNodeAtRuntime.derivePath(`m/0/0`);
    const authorizerWalletDerivedAgain = new ethers.Wallet(authorizerWalletNodeDerivedAgain.privateKey, ethProvider);
    const contractAsAuthorizer = chainApiContract.connect(authorizerWalletDerivedAgain);
    await contractAsAuthorizer.updateProviderWalletStatus(providerId, walletInd, reservedWallet.address);
    // Sends the change to reservedWallet

    // The requester derives the address of the wallet it got allocated

    // const provider = await chainApiContract.getProvider(providerId);
    const allocatedWallet = requesterHDNode.derivePath(`m/0/${walletInd}`); // for example
    // Requester funds it
    await requesterSigner.sendTransaction({
      to: allocatedWallet.address,
      value: ethers.utils.parseEther('1'),
    });

    // Requester deploys their client contract and marks it as theirs
    const clientContract = await clientContractFactory.deploy(chainApiContract.address, requesterId);

    // Requester associates their contract with their ID
    await chainApiContractAsRequesterAdmin.endorseClient(requesterId, clientContract.address);

    // Requester creates a request template for the provider endpoint using the ChainAPI dapp
    tx = await chainApiContractAsRequesterAdmin.createTemplate(endpointId, '0x12341234');
    logs = await ethProvider.getLogs({ address: chainApiContractAsRequesterAdmin.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    const templateId = chainApiInterface.parseLog(log).args.id;

    // Requester client contract makes the request using the templateId
    tx = await clientContract.request(providerId, templateId, '0x123123');
    logs = await ethProvider.getLogs({ address: chainApiContract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    //const requestId = chainApiInterface.parseLog(log).args.requestId;

    // Provider was listening for events from ChainApi with its providerId
    // and heard the log above. It first derives the wallet for the requester.
    //const requesterAddress = await chainApiInterface.parseLog(log).args.requester;
    // const requesterIdFromLog = await chainApiContract.getClientEndorserId(requesterAddress);
    // TODO: get the wallets with requesterIdFromLog
    //const walletIndFromEvent = await contract.getWalletWithRequesterAddress(providerId, requesterAddress);
    // Does the requester have a wallet allocated?
    //expect(walletIndFromEvent.toString()).not.toEqual('0');
    // Fetch the mnemonics from Secrets Manager and derive their wallet
    const allocatedWalletNodeAtRuntime = providerHDNodeAtRuntime.derivePath(`m/0/${walletInd}`);
    const allocatedWalletAtRuntime = new ethers.Wallet(allocatedWalletNodeAtRuntime.privateKey, ethProvider);
    // Probably check the wallet balance here
    const allocatedWalletBalance = await ethProvider.getBalance(allocatedWalletAtRuntime.address);
    expect(allocatedWalletBalance.toString()).not.toEqual('0');
    // Fulfill the request with the wallet
    const contractAsAllocatedWallet = chainApiContract.connect(allocatedWalletAtRuntime);
    await contractAsAllocatedWallet.fulfillRequest(
      chainApiInterface.parseLog(log).args.callbackAddress,
      chainApiInterface.parseLog(log).args.callbackFunctionId,
      chainApiInterface.parseLog(log).args.requestId,
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      {
        gasLimit: '500000',
      }
    );

    // We got our response!
    const data = await clientContract.data();
    expect(data.toString()).toEqual('0x0000000000000000000000000000000000000000000000000000000000000001');

    // The requester wants their money back now
    tx = await chainApiContractAsRequesterAdmin.withdrawRequest(providerId, allocatedWallet.address, requesterAdmin);
    // The node is listening for this
    logs = await ethProvider.getLogs({ address: chainApiContract.address });
    log = logs.filter((log) => log.transactionHash === tx.hash)[0];
    // TODO: Get balance, estimate transaction gas, send everything
    // Alternatively, we can send the transaction to ProviderStore to be redirected to the requester
    // That would emit an event, which help tell node if he was able to fulfill past WalletEmpty requests
  });
});
