// This is the documentation of the user flow more than a test
const { expect } = require('chai');

describe('User flow', function () {
  let airnode;
  let convenience;
  let airnodeClient;
  let roles;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    roles = {
      deployer: accounts[0],
      providerAdmin: accounts[1],
      requesterAdmin: accounts[2],
    };

    const airnodeFactory = await ethers.getContractFactory('Airnode');
    airnode = await airnodeFactory.deploy();
    const convenienceFactory = await ethers.getContractFactory('Convenience');
    convenience = await convenienceFactory.deploy(airnode.address);
    const airnodeClientFactory = await ethers.getContractFactory('MockAirnodeClient', roles.deployer);
    airnodeClient = await airnodeClientFactory.deploy(airnode.address);
  });

  it('works', async function () {
    // Normally, Airnode would retrieve its key from a secret management service.
    // Here, we will generate it instead. Only the node will have access to
    // providerMnemonic, while providerXpub will be publicly announced.
    let providerMnemonic, providerXpub;
    ({ providerMnemonic, providerXpub } = await generateProviderKey());
    // The provider's master wallet needs to be funded for it to create a provider
    // record first. This is only done once while deploying the node on a chain
    // for the first time. The master wallet will send the remaining funds to the
    // provider admin.
    await fundProviderMasterWallet(providerXpub);
    // Create the on-chain provider record. This will return the balance of the master
    // wallet to the provider admin.
    const providerId = await createProvider(providerMnemonic, providerXpub);
    // endpointId is the hash of the endpoint name from OIS
    // Note that the provider didn't need to make a transaction to create it
    const endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    // Create the on-chain requester record
    const requesterIndex = await createRequester();
    // The requester can fund their designated wallet
    const designatedWalletAddress = await fundDesignatedWallet(requesterIndex, providerXpub);
    // The requester introduces the client contract to the Airnode contract as one
    // of its own. This means that the requests made by the client contract will
    // be funded by the requester's designated wallet.
    await airnode
      .connect(roles.requesterAdmin)
      .updateClientEndorsementStatus(requesterIndex, airnodeClient.address, true);
    // The requester creates the template which keeps the request parameters
    const templateId = await createTemplate(providerId, endpointId);
    // Someone calls the client contract, which triggers a short request
    await airnodeClient.makeRequest(
      templateId,
      requesterIndex,
      designatedWalletAddress,
      airnodeClient.address,
      airnodeClient.interface.getSighash('fulfill(bytes32,uint256,bytes)'),
      ethers.utils.randomBytes(16)
    );
    // The Airnode fulfills the short request
    await fulfillRequest(providerId, providerMnemonic, providerXpub);
    // We got our response!
    const airnodeClientLogs = await waffle.provider.getLogs({
      address: airnodeClient.address,
      fromBlock: 0,
    });
    const parsedAirnodeClientLog = airnodeClient.interface.parseLog(airnodeClientLogs[0]);
    console.log(ethers.utils.parseBytes32String(parsedAirnodeClientLog.args.data));

    // Now the requester wants the amount deposited at their reserved wallet back
    await airnode
      .connect(roles.requesterAdmin)
      .requestWithdrawal(providerId, requesterIndex, designatedWalletAddress, roles.requesterAdmin.address);
    // and the Airnode fulfills it
    await fulfillWithdrawalRequest(providerId, providerMnemonic);
  });

  async function generateProviderKey() {
    // Generate the keys
    const wallet = ethers.Wallet.createRandom();
    // Derive the extended public key that will be announced publicly
    const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
    const xpub = hdNode.neuter().extendedKey;
    return {
      providerMnemonic: wallet.mnemonic.phrase,
      providerXpub: xpub,
    };
  }

  async function fundProviderMasterWallet(providerXpub) {
    // The provider knows their xpub so they can derive their master wallet address
    const masterWalletAddress = deriveWalletAddressFromPath(providerXpub, 'm');
    // Creating the provider (calling createProvider()) will cost 200,00 gas.
    // 0.1 ETH should be able to cover it. Note that this depends on the current
    // gas prices. The provider should make sure to send at least 200,000*gasPrice.
    // The master wallet will send the remainder to the provider admin, so it's
    // okay to overestimate this value.
    await roles.providerAdmin.sendTransaction({
      to: masterWalletAddress,
      value: ethers.utils.parseEther('0.1'),
    });
  }

  function deriveWalletFromPath(providerMnemonic, path) {
    // The node uses this function to derive a wallet using its path
    const masterHdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
    const designatorHdNode = masterHdNode.derivePath(path);
    return new ethers.Wallet(designatorHdNode.privateKey, waffle.provider);
  }

  async function deriveWalletAddressFromPath(providerXpub, path) {
    // Anyone can use this function derive the address of a wallet using its path
    const hdNode = ethers.utils.HDNode.fromExtendedKey(providerXpub);
    const wallet = hdNode.derivePath(path);
    return wallet.address;
  }

  async function createProvider(providerMnemonic, providerXpub) {
    // The provider's Airnode wakes up. Checks if its providerId is registered
    // at the Airnode contract.
    const masterWallet = deriveWalletFromPath(providerMnemonic, 'm');
    // The providerId of a provider is the hash of their master wallet address
    const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
    let retrievedProvider = await airnode.getProvider(providerId);
    // The retrieved provider will be empty because it's not created yet
    expect(retrievedProvider.xpub).to.equal('');
    // The Airnode should create it in that case.

    // Gas cost is 160,076
    const estimatedGasCost = await airnode
      .connect(masterWallet)
      .estimateGas.createProvider(roles.providerAdmin.address, providerXpub, [ethers.constants.AddressZero], {
        value: 1,
      });
    // Overestimate a bit
    const gasLimit = estimatedGasCost.add(ethers.BigNumber.from(20000));
    const gasPrice = await waffle.provider.getGasPrice();
    const txCost = gasLimit.mul(gasPrice);
    const masterWalletBalance = await waffle.provider.getBalance(masterWallet.address);
    const fundsToSend = masterWalletBalance.sub(txCost);
    // Create the provider and send the rest of the master wallet balance along with
    // this transaction. Provider admin will receive these funds.
    await airnode
      .connect(masterWallet)
      .createProvider(roles.providerAdmin.address, providerXpub, [ethers.constants.AddressZero], {
        value: fundsToSend,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
      });

    // The Airnode goes back to sleep
    // The next time it wakes up, it checks if its provider record exists on-chain.
    retrievedProvider = await airnode.getProvider(providerId);
    expect(retrievedProvider.xpub).to.equal(providerXpub);
    // It does exist, so the node can move on to handling requests
    return providerId;
  }

  async function createRequester() {
    const tx = await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin.address);
    // Get the newly created requester's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    return parsedLog.args.requesterIndex;
  }

  async function fundDesignatedWallet(requesterIndex, providerXpub) {
    // The requester derives the address of their designated wallet using the provider's
    // xpub and their requesterIndex and fund that wallet.
    const designatedWalletAddress = await deriveWalletAddressFromPath(providerXpub, `m/0/${requesterIndex.toString()}`);
    // The requester should send more than minBalance of the provider (it was 0.01 ETH in this case)
    await roles.requesterAdmin.sendTransaction({
      to: designatedWalletAddress,
      value: ethers.utils.parseEther('0.1'),
    });
    return designatedWalletAddress;
  }

  async function createTemplate(providerId, endpointId) {
    // Note that we are not connecting to the contract as requesterAdmin.
    // That's because it doesn't matter who creates the template.
    const tx = await airnode.createTemplate(providerId, endpointId, ethers.utils.randomBytes(8));
    // Get the newly created template's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    return parsedLog.args.templateId;
  }

  async function fulfillRequest(providerId, providerMnemonic, providerXpub) {
    // The provider node can get all events that concern it with a single call.
    const providerLogs = await waffle.provider.getLogs({
      address: airnode.address,
      fromBlock: 0, // This would be block number from ~1 hour ago
      topics: [null, providerId],
    });
    const parsedProviderLogs = providerLogs.map((providerLog) => airnode.interface.parseLog(providerLog));
    // Although that's super cool, we're only interested in the short request events here
    const parsedRequestLog = parsedProviderLogs.filter(
      (parsedProviderLog) => parsedProviderLog.name == 'ClientRequestCreated'
    )[0];

    // Verify that the request parameters are not tampered with
    const expectedRequestId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address', 'bytes32', 'bytes'],
        [
          parsedRequestLog.args.noRequests,
          parsedRequestLog.args.clientAddress,
          parsedRequestLog.args.templateId,
          parsedRequestLog.args.parameters,
        ]
      )
    );
    expect(parsedRequestLog.args.requestId).to.equal(expectedRequestId);

    // Fetch the template
    const template = await airnode.getTemplate(parsedRequestLog.args.templateId);
    // Verify that the template parameters are not tampered with
    const expectedTemplateId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes'],
        [template.providerId, template.endpointId, template.parameters]
      )
    );
    expect(parsedRequestLog.args.templateId).to.equal(expectedTemplateId);
    // Verify that the designated wallet is correct
    const expectedDesignatedWallet = await deriveWalletAddressFromPath(
      providerXpub,
      `m/0/${parsedRequestLog.args.requesterIndex.toString()}`
    );
    expect(parsedRequestLog.args.designatedWallet).to.equal(expectedDesignatedWallet);
    // Check authorization status
    const authorizationStatus = await convenience.checkAuthorizationStatus(
      providerId,
      parsedRequestLog.args.requestId,
      template.endpointId,
      parsedRequestLog.args.requesterIndex,
      parsedRequestLog.args.designatedWallet,
      parsedRequestLog.args.clientAddress
    );
    expect(authorizationStatus).to.equal(true);
    // Now the node can use template.endpointId to find in config.json which
    // endpoint it should call. Then, it decodes the static request parameters defined
    // in template.parameters, the dynamic request parameters defined in
    // parsedRequestLog.args.parameters, insert these to correct fields and make the
    // API call. After it gets the response, it processes it according to the reserved
    // parameters (_path, _times, _type) and fulfills the request with the outcome.
    const designatedWallet = await deriveWalletFromPath(
      providerMnemonic,
      `m/0/${parsedRequestLog.args.requesterIndex.toString()}`
    );
    await airnode.connect(designatedWallet).fulfill(
      parsedRequestLog.args.requestId,
      providerId,
      ethers.BigNumber.from(0), // 0 as the statusCode = success
      ethers.utils.formatBytes32String('Hello!'),
      parsedRequestLog.args.fulfillAddress,
      parsedRequestLog.args.fulfillFunctionId,
      {
        // 500000 is a safe value and we can allow the requester to set this
        // with a _gasLimit reserved parameter (for example, if they want to run
        // a very gas-heavy aggregation method)
        gasLimit: 500000,
      }
    );
  }

  async function fulfillWithdrawalRequest(providerId, providerMnemonic) {
    // The node gets the WithdrawalRequested log
    const providerLogs = await waffle.provider.getLogs({
      address: airnode.address,
      fromBlock: 0, // This would be block number from ~1 hour ago
      topics: [null, providerId],
    });
    const parsedProviderLogs = providerLogs.map((providerLog) => airnode.interface.parseLog(providerLog));
    const parsedWithdrawalRequestLog = parsedProviderLogs.filter(
      (parsedProviderLog) => parsedProviderLog.name == 'WithdrawalRequested'
    )[0];

    const designatedWallet = await deriveWalletFromPath(
      providerMnemonic,
      `m/0/${parsedWithdrawalRequestLog.args.requesterIndex.toString()}`
    );
    // Verify that the provided designatedWallet was correct
    expect(parsedWithdrawalRequestLog.args.designatedWallet).to.equal(designatedWallet.address);

    // Gas cost is 41,701
    const estimatedGasCost = await airnode
      .connect(designatedWallet)
      .estimateGas.fulfillWithdrawal(
        parsedWithdrawalRequestLog.args.withdrawalRequestId,
        parsedWithdrawalRequestLog.args.providerId,
        parsedWithdrawalRequestLog.args.requesterIndex,
        parsedWithdrawalRequestLog.args.destination,
        { value: 1 }
      );
    // Overestimate a bit
    const gasLimit = estimatedGasCost.add(ethers.BigNumber.from(20000));
    const gasPrice = await waffle.provider.getGasPrice();
    const txCost = gasLimit.mul(gasPrice);
    const designatedWalletBalance = await waffle.provider.getBalance(designatedWallet.address);
    const fundsToSend = designatedWalletBalance.sub(txCost);
    await airnode
      .connect(designatedWallet)
      .fulfillWithdrawal(
        parsedWithdrawalRequestLog.args.withdrawalRequestId,
        parsedWithdrawalRequestLog.args.providerId,
        parsedWithdrawalRequestLog.args.requesterIndex,
        parsedWithdrawalRequestLog.args.destination,
        { value: fundsToSend, gasLimit: gasLimit, gasPrice: gasPrice }
      );
  }
});
