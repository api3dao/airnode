/* global ethers, waffle */
const { expect } = require('chai');

describe('Airnode', function () {
  let roles;
  let airnode;
  //let convenience;
  let airnodeClient;
  let providerKey;
  let providerId;
  let requesterInd;
  let designatedWalletAddress;
  let endpointId;
  let templateId;

  beforeEach(async () => {
    const airnodeFactory = await ethers.getContractFactory('Airnode');
    airnode = await airnodeFactory.deploy();
    //const convenienceFactory = await ethers.getContractFactory('Convenience');
    //convenience = await convenienceFactory.deploy(airnode.address);
    const airnodeClientFactory = await ethers.getContractFactory('ExampleAirnodeClient');
    airnodeClient = await airnodeClientFactory.deploy(airnode.address);
    const accountList = await ethers.getSigners();
    roles = {
      providerAdmin: accountList[0],
      requesterAdmin: accountList[1],
    };
  });

  it('works', async function () {
    // Normally, the Airnode would retrieve its key from a secret management service.
    // Here, we will generate it instead. Only the node will have access to
    // providerKey.mnemonics, while providerKey.xpub will be publicly announced.
    await generateProviderKey();
    // The provider's master wallet needs to be funded for it to create a provider
    // record first. This is only done once while deploying the node on a chain
    // for the first time. The master wallet will send the remaining funds to the
    // provider admin.
    await fundProviderMasterWallet();
    // Create the on-chain provider record. This will return the balance of the master
    // wallet to the provider admin.
    await createProvider();
    // endpointId is the hash of the endpoint name from OIS
    // Note that the provider didn't need to make a transaction to create it
    endpointId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], ['convertToUsd']));
    // However, the provider makes a transaction to update the endpoint's authorizers as [0x0],
    // which means allow everyone
    await airnode
      .connect(roles.providerAdmin)
      .updateEndpointAuthorizers(providerId, endpointId, [ethers.constants.AddressZero]);

    // Create the on-chain requester record
    await createRequester();
    // The requester can fund their designated wallet
    await fundDesignatedWallet();
    // The requester introduces the client contract to the Airnode contract as one
    // of its own. This means that the requests made by the client contract will
    // be funded by the requester's designated wallet.
    await airnode
      .connect(roles.requesterAdmin)
      .updateClientEndorsementStatus(requesterInd, airnodeClient.address, true);
    // The requester creates the template which keeps the request parameters
    await createTemplate();

    // Someone calls the client contract, which triggers a short request
    await airnodeClient.triggerShortRequest(templateId, ethers.utils.randomBytes(16));
    // The Airnode fulfills the short request
    await fulfillShortRequest();
    // We got our response!
    console.log(ethers.utils.parseBytes32String(await airnodeClient.data()));

    // Now the requester wants the amount deposited at their reserved wallet back
    await airnode
      .connect(roles.requesterAdmin)
      .requestWithdrawal(providerId, requesterInd, designatedWalletAddress, roles.requesterAdmin._address);
    // and the Airnode fulfills it
    await fulfillWithdrawalRequest();
  });

  async function generateProviderKey() {
    // Generate the keys
    const wallet = ethers.Wallet.createRandom();
    // Derive the extended public key that will be announced publicly
    const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
    const xpub = hdNode.neuter().extendedKey;
    providerKey = {
      mnemonic: wallet.mnemonic.phrase,
      xpub: xpub,
    };
  }

  async function fundProviderMasterWallet() {
    // The provider knows their xpub so they can derive their master wallet address
    const masterWalletAddress = deriveWalletAddressFromPath('m');
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

  function deriveWalletFromPath(path) {
    // The node uses this function to derive a wallet using its path
    const masterHdNode = ethers.utils.HDNode.fromMnemonic(providerKey.mnemonic);
    const designatorHdNode = masterHdNode.derivePath(path);
    return new ethers.Wallet(designatorHdNode.privateKey, waffle.provider);
  }

  async function deriveWalletAddressFromPath(path) {
    // Anyone can use this function derive the address of a wallet using its path
    const hdNode = ethers.utils.HDNode.fromExtendedKey(providerKey.xpub);
    const wallet = hdNode.derivePath(path);
    return wallet.address;
  }

  async function createProvider() {
    // The provider's Airnode wakes up. Checks if its providerId is registered
    // at the Airnode contract.
    const masterWallet = deriveWalletFromPath('m');
    // The providerId of a provider is the hash of their master wallet address
    providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
    let retrievedProvider = await airnode.getProvider(providerId);
    // The retrieved provider will be empty because it's not created yet. The Airnode
    // should create it in that case.
    if (retrievedProvider.xpub === '') {
      // minBalance is the minimum balance a designated wallet needs to have for
      // it to be eligible to be used to fulfill a request. It is implemented to
      // prevent requests being made to designated wallets not funded enough to
      // fulfill requests, which would cause the respective API calls to be made
      // each polling cycle.
      // The Airnode reads both minBalance and providerAdmin from config.json
      const minBalance = ethers.utils.parseEther('0.01');

      /*
      // Gas cost is 180,890
      const esimatedGasCost = await airnode
        .connect(masterWallet)
        .estimateGas
        .createProvider(roles.providerAdmin._address, providerKey.xpub, minBalance, {value: 1});
      */

      // Overestimate a bit
      const gasLimit = ethers.BigNumber.from(200000);
      const gasPrice = await waffle.provider.getGasPrice();
      const txCost = gasLimit.mul(gasPrice);
      const masterWalletBalance = await waffle.provider.getBalance(masterWallet.address);
      const fundsToSend = masterWalletBalance.sub(txCost);
      await airnode.connect(masterWallet).createProvider(roles.providerAdmin._address, providerKey.xpub, minBalance, {
        value: fundsToSend,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
      });
    }
    // The Airnode goes back to sleep. The next time it wakes up, it checks if its
    // provider record exists on-chain.
    retrievedProvider = await airnode.getProvider(providerId);
    expect(retrievedProvider.xpub).to.equal(providerKey.xpub);
    // It does exist, so the node can move on to handling requests
  }

  async function createRequester() {
    const tx = await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin._address);
    // Get the newly created requester's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    requesterInd = parsedLog.args.requesterInd;
  }

  async function fundDesignatedWallet() {
    // The requester derives the address of their designated wallet using the provider's
    // xpub and their requesterInd and fund that wallet.
    designatedWalletAddress = await deriveWalletAddressFromPath(`m/0/${requesterInd.toString()}`);
    // The requester should send more than minBalance of the provider (it was 0.01 ETH in this case)
    await roles.requesterAdmin.sendTransaction({
      to: designatedWalletAddress,
      value: ethers.utils.parseEther('0.1'),
    });
  }

  async function createTemplate() {
    // Note that we are not connecting to the contract as requesterAdmin.
    // That's because it doesn't matter who creates the template.
    const tx = await airnode.createTemplate(
      providerId,
      endpointId,
      requesterInd,
      designatedWalletAddress,
      airnodeClient.address,
      airnodeClient.interface.getSighash('fulfill(bytes32,uint256,bytes32)'),
      ethers.utils.randomBytes(8)
    );
    // Get the newly created template's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    templateId = parsedLog.args.templateId;
  }

  async function fulfillShortRequest() {
    // The provider node can get all events that concern it with a single call.
    const providerLogs = await waffle.provider.getLogs({
      address: airnode.address,
      fromBlock: 0, // This would be block number from ~1 hour ago
      topics: [null, providerId],
    });
    const parsedProviderLogs = providerLogs.map((providerLog) => airnode.interface.parseLog(providerLog));
    // Although that's super cool, we're only interested in the short request events here
    const parsedRequestLog = parsedProviderLogs.filter(
      (parsedProviderLog) => parsedProviderLog.name == 'ClientShortRequestCreated'
    )[0];

    // Verify that the request parameters are not tampered with
    const expectedRequestId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32', 'bytes'],
        [parsedRequestLog.args.noRequests, parsedRequestLog.args.templateId, parsedRequestLog.args.parameters]
      )
    );
    expect(parsedRequestLog.args.requestId).to.equal(expectedRequestId);

    // Fetch the template (Convenience.sol would be used for this)
    const template = await airnode.getTemplate(parsedRequestLog.args.templateId);
    // Verify that the template parameters are not tampered with
    const expectedTemplateId = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'uint256', 'address', 'address', 'bytes4', 'bytes'],
        [
          template.providerId,
          template.endpointId,
          template.requesterInd,
          template.designatedWallet,
          template.fulfillAddress,
          template.fulfillFunctionId,
          template.parameters,
        ]
      )
    );
    expect(parsedRequestLog.args.templateId).to.equal(expectedTemplateId);
    // Verify that the designated wallet is correct
    const expectedDesignatedWallet = await deriveWalletAddressFromPath(`m/0/${template.requesterInd.toString()}`);
    expect(template.designatedWallet).to.equal(expectedDesignatedWallet);
    // Check authorization status
    const authorizationStatus = await airnode.checkAuthorizationStatus(
      providerId,
      template.endpointId,
      template.requesterInd,
      parsedRequestLog.args.requester
    );
    expect(authorizationStatus).to.equal(true);

    // Now the node can use template.endpointId to find in config.json which
    // endpoint it should call. Then, it decodes the static request parameters defined
    // in template.parameters, the dynamic request parameters defined in
    // parsedRequestLog.parameters, insert these to correct fields and make the
    // API call. After it gets the response, it processes it according to the reserved
    // integration parameters (_path, _times, _type) and fulfills the request with
    // the outcome.

    const designatedWallet = await deriveWalletFromPath(`m/0/${template.requesterInd.toString()}`);
    await airnode.connect(designatedWallet).fulfill(
      parsedRequestLog.args.requestId,
      providerId,
      ethers.BigNumber.from(0), // 0 as the statusCode = success
      ethers.utils.formatBytes32String('Hello!'),
      template.fulfillAddress,
      template.fulfillFunctionId,
      {
        gasLimit: 500000, // For some reason, the default gas limit is too high
        // 500000 is a safe value and we can allow the requester to set this
        // with a _gasLimit reserved parameter (for example, if they want to run
        // a very gas-heavy aggregation method)
      }
    );
  }

  async function fulfillWithdrawalRequest() {
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
      `m/0/${parsedWithdrawalRequestLog.args.requesterInd.toString()}`
    );
    // Verify that the provided designatedWallet was correct
    expect(parsedWithdrawalRequestLog.args.designatedWallet).to.equal(designatedWallet.address);

    /*
    // Gas cost is 41,797
    const esimatedGasCost = await airnode
        .connect(designatedWallet)
        .estimateGas
        .fulfillWithdrawal( parsedWithdrawalRequestLog.args.withdrawalRequestId,
          parsedWithdrawalRequestLog.args.providerId,
          parsedWithdrawalRequestLog.args.requesterInd,
          parsedWithdrawalRequestLog.args.destination, {value: 1});
    */
    // Overestimate a bit
    const gasLimit = ethers.BigNumber.from(50000);
    const gasPrice = await waffle.provider.getGasPrice();
    const txCost = gasLimit.mul(gasPrice);
    const designatedWalletBalance = await waffle.provider.getBalance(designatedWallet.address);
    const fundsToSend = designatedWalletBalance.sub(txCost);
    await airnode
      .connect(designatedWallet)
      .fulfillWithdrawal(
        parsedWithdrawalRequestLog.args.withdrawalRequestId,
        parsedWithdrawalRequestLog.args.providerId,
        parsedWithdrawalRequestLog.args.requesterInd,
        parsedWithdrawalRequestLog.args.destination,
        { value: fundsToSend, gasLimit: gasLimit, gasPrice: gasPrice }
      );
  }
});
