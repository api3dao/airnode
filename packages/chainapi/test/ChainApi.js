/* global ethers, waffle */

describe('ChainApi', function () {
  let accounts;
  let chainApi;
  let client;

  beforeEach(async () => {
    const chainApiFactory = await ethers.getContractFactory('ChainApi');
    chainApi = await chainApiFactory.deploy();
    const accountList = await ethers.getSigners();
    accounts = {
      providerAdmin: accountList[0],
      requesterAdmin: accountList[1],
    };
  });

  it('works', async function () {
    // The requesters need to deposit at least authorizationDeposit ETH to have
    // a wallet reserved. The node uses this to automatically make a transaction
    // that authorizes the reserved wallet address to fulfill requests, and
    // deposits the rest to the reserved wallet.
    const authorizationDeposit = ethers.utils.parseEther('0.05');
    // After sign up, ChainAPI has the provider make a transaction to create
    // a provider record at the contract and get assigned an ID.
    const providerId = await createProvider(authorizationDeposit);

    // The provider generates the OIS that integrates their API to an endpoint
    // using ChainAPI.

    // The provider clicks FINALIZE at the endpoint list, which has them make
    // a transaction to create an endpoint record at the contract and assign
    // an ID to it.
    const endpointId = await createEndpoint(providerId);

    // The provider initiates a deployment, which creates a config.json file
    // in which this endpointId is used. The provider deploys the node. The node
    // generates keys for the provider and stores them at SSM. They send us
    // xpub and authorizerAddress over the API (actually we only need xpub
    // and can derive authorizerAddress from that with path m/0/0/0).
    const providerKeys = await generateProviderKey();

    // After they have deployed the node, the provider has to come back to ChainAPI
    // to do the transaction below to announce their extended public key. We will have
    // received these through the API so we can fill in the arguments for them.
    await initializeProviderKey(providerId, providerKeys.xpub, providerKeys.authorizerAddress);

    // After sign up, ChainAPI has the requester make a transaction to create
    // a requester record at the contract and get assigned an ID.
    const requesterId = await createRequester();

    // The requester reserves a wallet from the provider.
    const { walletInd, depositAmount } = await reserveWallet(providerId, requesterId, authorizationDeposit);
    // Note that the requester only received the index of the wallet here, and
    // not the wallet address. This is because we can't derive the wallet address
    // on-chain (because it's computationally intensive). See deriveWalletAddressFromIndex()
    // for how it's done off-chain. We will run that as soon as the reservation
    // transaction goes through and tell the requester what their reserved wallet address
    // is.

    // The node was listening for wallet reservation events, and will authorize the
    // corresponding address with authorizerAddress automatically.
    await authorizeWallet(providerId, providerKeys, walletInd, depositAmount);

    // The requester deploys a client contract. The client contract needs two arguments:
    // ChainApi addres: I make my requests here
    // requesterId: I belong to this guy so let him decide for me
    const clientFactory = await ethers.getContractFactory('ExampleClient');
    client = await clientFactory.deploy(chainApi.address, requesterId);

    // The requester introduces the client contract to ChainApi contract as one
    // of its own. This means that the requests made by the client contract will
    // be funded by the requester's reserved wallet.
    await endorseClient(requesterId, client.address);
    // Note that this would have reverted if the client didn't announce
    // requesterId as its potential endorser. This is because we don't want
    // random people to endorse a client contract, then underfund their reserved
    // wallets to deny the client service. So clients should only announce
    // trusted requesters as potential endorsers.

    // The requester creates a request template, telling which endpoint to call
    // and what parameters to use. The parameters defined at this stage are
    // static, doesn't change between requests.
    const templateId = await createTemplate(endpointId, ethers.utils.randomBytes(8));

    // Someone calls the client contract, which triggers a request.
    // We have additional parameters here, determined at request-time.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const requestId = await makeRequest(providerId, templateId, ethers.utils.randomBytes(4));

    // The provider node has been listening for events from the ChainApi contract
    // so the request will see and fulfill it.
    await fulfillRequest(providerId, providerKeys);

    // We got our response!
    console.log(ethers.utils.parseBytes32String(await client.data()));

    // Now the requester wants the amount deposited at their reserved wallet back
    const walletAddress = deriveWalletAddressFromIndex(providerKeys.xpub, walletInd);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const withdrawRequestId = await createWithdrawRequest(
      providerId,
      requesterId,
      walletAddress,
      accounts.requesterAdmin.getAddress()
    );

    // Similar to the oracle request, the provider node has been listening for this
    // and fulfills it
    await fulfillWithdrawRequest(providerId, providerKeys);

    // So the node is listening for three kind of requests
    // 1 - Listens for wallet reservations and responds to them by authorizing the
    // wallet's address with its authorizerAddress
    // 2 - Listens for oracle requests and responds to them with requester's
    // reserved wallet
    // 3 - Listens for withdrawal requests and responds to them with requester's
    // reserved wallet
    // All three types emit an event during request and fulfillment. Whenever the
    // node sees a request event, it looks for a matching fulfill event. If there
    // is no fulfill event, this means that the request should be fulfilled.
    // The node gets all request-fulfill events for 1-2-3 with a single Ethereum
    // node call, which means that the node doesn't need to make many calls if
    // not much is happening.
  });

  async function createProvider(authorizationDeposit) {
    const tx = await chainApi
      .connect(accounts.providerAdmin)
      .createProvider(
        await accounts.providerAdmin.getAddress(),
        authorizationDeposit
      );
    // Get the newly created provider's ID from the event
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const providerId = parsedLog.args.id;
    return providerId;
  }

  async function createEndpoint(providerId) {
    // The second argument [] here is the list of Authorizer contracts for the
    // endpoint. An Authorizer contract decides if a requester address is allowed
    // to make a request to a specific endpoint (depending on whitelist, payment, etc.).
    // It is left empty because Authorizers are not implemented yet, which means that
    // this endpoint is public.
    const tx = await chainApi.connect(accounts.providerAdmin).createEndpoint(providerId, []);
    // Get the newly created endpoint's ID from the event
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const endpointId = parsedLog.args.id;
    return endpointId;
  }

  async function generateProviderKey() {
    // Generate the keys
    const wallet = ethers.Wallet.createRandom();
    // Get the extended public key that will be announced publicly.
    // Anyone can derive the address that a wallet index refers to using this xpub.
    const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
    const xpub = hdNode.neuter().extendedKey;
    // We designate m/0/0/0 as a wallet with a special function. Specifically,
    // it is used to call ProviderStore to authorize reserved wallet addresses
    // to fulfill requests.
    const authorizerWallet = hdNode.derivePath(`m/0/0/0`);
    return {
      mnemonics: wallet.mnemonic.phrase,
      xpub: xpub,
      authorizerAddress: authorizerWallet.address,
    };
  }

  async function initializeProviderKey(providerId, xpub, authorizerAddress) {
    chainApi
      .connect(accounts.providerAdmin)
      .initializeProviderKeys(
        providerId,
        xpub,
        authorizerAddress
        );
  }

  async function createRequester() {
    const tx = await chainApi
      .connect(accounts.requesterAdmin)
      .createRequester(
        accounts.requesterAdmin.getAddress()
        );
    // Get the newly created requester's ID from the event
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const requesterId = parsedLog.args.id;
    return requesterId;
  }

  async function reserveWallet(providerId, requesterId, authorizationDeposit) {
    // Note that the requester sends authorizationDeposit amount of ETH along with
    // this transaction. The contract sends it to authorizerAddress of the provider,
    // which will make a transaction to authorize the newly reserved wallet to
    // fulfill requests for this provider. Then, authorizerAddress will send the rest
    // of the funds to the newly reserved wallet address. This means that the requester
    // can send more than authorizationDeposit along with this transaction to reserve
    // a wallet and fund it in a single transaction.
    const tx = await chainApi
      .connect(accounts.requesterAdmin)
      .reserveWallet(providerId, requesterId, { value: authorizationDeposit });
    // Get the newly reserved wallet's index from the event
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const walletInd = parsedLog.args.walletInd;
    // The node needs to get depositAmount from the event in case the requester
    // sent more than authorizationDeposit (which is not the case here).
    const depositAmount = parsedLog.args.depositAmount;
    return { walletInd, depositAmount };
  }

  async function authorizeWallet(providerId, providerKeys, walletInd, depositAmount) {
    // We will authorize this address
    const walletAddress = await deriveWalletAddressFromIndex(providerKeys.xpub, walletInd);
    // Now let's derive the private keys for authorizerAddress because we need
    // to call the contract through the corresponding wallet. Note that
    // authorizerAddress only has what the requester has sent while reserving
    // the wallet (0.05 ETH).
    const authorizerWallet = deriveWalletFromPath(providerKeys.mnemonics, 'm/0/0/0');
    // The following transaction (authorizeProviderWallet()) takes 81,247 gas.
    // We will leave some slack (in case a block gets uncled and transactions
    // revert, or gas costs of operations increase with a fork) and say it's
    // 100,000.
    const gasCost = ethers.BigNumber.from(100000);
    const gasPrice = await waffle.provider.getGasPrice();
    // The requester sent 0.05 ETH to have their wallet authorized. We use
    // 0.0008 ETH for the transaction (gasCost x gasPrice) and send the remaining
    // 0.0492 ETH to their newly reserved wallet.
    const txCost = gasCost.mul(gasPrice);
    const fundsToSend = depositAmount.sub(txCost);
    chainApi.connect(authorizerWallet).authorizeProviderWallet(providerId, walletAddress, walletInd, {
      gasLimit: gasCost,
      gasPrice: gasPrice,
      value: fundsToSend
    });
    // This transaction emits an event. The node uses this event to be able to
    // tell that it has already authorized a reserved wallet and doesn't try
    // again (so very similar to an oracle request-response pattern).
    // At this point, we have very little ETH left in authorizerWallet, but the
    // next requester reserving a wallet will fund it with 0.05 ETH again.
  }

  function deriveWalletFromPath(mnemonics, path) {
    // This is function that the node uses to derive the private key of an
    // arbitrary wallet path.
    const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonics);
    const authorizerHdNode = masterHdNode.derivePath(path);
    return new ethers.Wallet(authorizerHdNode.privateKey, waffle.provider);
  }

  async function deriveWalletAddressFromIndex(xpub, walletInd) {
    // This is function that anyone can use to derive the address of an arbitrary
    // wallet index. That's because xpub is announced publicly at the contract
    // by the provider.
    const hdNode = ethers.utils.HDNode.fromExtendedKey(xpub);
    // We can reserve 2^256-1 different wallets as below
    // m/0/0/0: authorizerAddress
    // m/0/0/1: First reserved wallet path
    // m/0/0/2: Second reserved wallet path
    // ...
    // m/0/0/2^31-1 (because each index is represented in 31-bits)
    // m/0/1/0
    // m/0/1/1
    // ...
    // but I think we're fine with 2^31-1 maximum wallets per provider, so:
    const wallet = hdNode.derivePath(`m/0/0/${walletInd}`);
    return wallet.address;
  }

  async function endorseClient(requesterId, clientAddress) {
    // Endorsing a client contract is essentially the requester saying "I accept
    // that the requests made by this client contract will be funded from my
    // reserved wallet."
    chainApi.connect(accounts.requesterAdmin).endorseClient(requesterId, clientAddress);
  }

  async function createTemplate(endpointId, staticParameters) {
    // Note that we are not connecting to the contract as requesterAdmin.
    // That's because it doesn't matter who creates the template.
    const tx = await chainApi.createTemplate(endpointId, staticParameters);
    // Get the newly created template's ID from the event
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const templateId = parsedLog.args.id;
    return templateId;
  }

  async function makeRequest(providerId, templateId, dynamicParameters) {
    const tx = await client.request(providerId, templateId, dynamicParameters);
    // Get the newly created template's ID from the event. Note that we are
    // listening from ChainApi and not Client, because that's where the event
    // is emitted.
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const requestId = parsedLog.args.requestId;
    return requestId;
    // There is an alternative way of making a request. If the request doesn't have
    // any static parameters to be recorded at a template, the requester can make
    // the request by referring to the endpointId over templateId using the method
    // makeDirectRequest(). This allows the requester to avoid making the transaction
    // to create the template and the node doesn't need to call the Ethereum node
    // one extra time to get the static parameters corresponding to a templateId.
    // We don't need to support this at ChainAPI/Airnode yet, I just wanted to
    // have it as an option at the contract.
  }

  async function fulfillRequest(providerId, providerKeys) {
    // The provider node can get all events that concern it with a single call.
    const providerLogs = await waffle.provider.getLogs({
      address: chainApi.address,
      fromBlock: 0, // This would be block number from ~1 hour ago
      topics: [null, providerId],
    });
    const parsedProviderLogs = providerLogs.map((providerLog) => chainApi.interface.parseLog(providerLog));
    // Although that's super cool, we're only interested in the oracle request events here
    const parsedRequestLog = parsedProviderLogs.filter(
      (parsedProviderLog) => parsedProviderLog.name == 'RequestMade'
    )[0];
    // The node has the templateId now, let's fetch the endpointId and static parameters
    const templateLogs = await waffle.provider.getLogs({
      address: chainApi.address,
      fromBlock: 0,
      topics: [ethers.utils.id('TemplateCreated(bytes32,bytes32,bytes)'), parsedRequestLog.args.templateId],
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const parsedTemplateLog = chainApi.interface.parseLog(templateLogs[0]);
    // Now the node has the endpointId from parsedTemplateLog, it can
    // look through config.json to find which API operation to call. Then, it
    // decodes the static request parameters defined in parsedTemplateLog.parameters,
    // the dynamic request parameters defined in parsedRequestLog.parameters,
    // insert these to correct fields and make the API call. After it gets the
    // response, it processes it according to the reserved integration parameters
    // (_path, _times, _type) and fulfills the request with the outcome.

    // To fulfill, it will first have to derive the private key for the wallet
    // reserved by the requester.
    const walletInd = await chainApi.getProviderWalletIndWithClientAddress(providerId, parsedRequestLog.args.requester);
    // If walletInd was 0 here, that would have meant that the client making
    // the request isn't endorser by a requester with a reserved wallet and
    // shouldn't be responded to. Fortunately we got 1.
    const reservedWallet = deriveWalletFromPath(providerKeys.mnemonics, `m/0/0/${walletInd}`);
    // The node fulfills the request with the derived wallet.
    await chainApi
      .connect(reservedWallet)
      .fulfillRequest(
        parsedRequestLog.args.callbackAddress,
        parsedRequestLog.args.callbackFunctionId,
        parsedRequestLog.args.requestId,
        ethers.utils.formatBytes32String('Hello!'),
        {
          gasLimit: 500000, // For some reason, the default gas limit is too high
          // 500000 is a safe value and we can allow the requester to set this
          // with a _gasLimit reserved parameter (for example, if they want to run
          // a very gas-heavy aggregation method)
        }
      );
  }

  async function createWithdrawRequest(providerId, requesterId, walletAddress, destination) {
    // Only the requester admin can do this
    const tx = await chainApi
      .connect(accounts.requesterAdmin)
      .requestWithdraw(providerId, requesterId, walletAddress, destination);
    // Get the newly created withdraw request's ID from the event
    const log = (await waffle.provider.getLogs({ address: chainApi.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = chainApi.interface.parseLog(log);
    const withdrawRequestId = parsedLog.args.withdrawRequestId;
    return withdrawRequestId;
  }

  async function fulfillWithdrawRequest(providerId, providerKeys) {
    // The node gets the WithdrawRequested log
    const providerLogs = await waffle.provider.getLogs({
      address: chainApi.address,
      fromBlock: 0, // This would be block number from ~1 hour ago
      topics: [null, providerId],
    });
    const parsedProviderLogs = providerLogs.map((providerLog) => chainApi.interface.parseLog(providerLog));
    const parsedWithdrawRequestLog = parsedProviderLogs.filter(
      (parsedProviderLog) => parsedProviderLog.name == 'WithdrawRequested'
    )[0];

    const walletInd = await chainApi.getProviderWalletIndWithRequesterId(
      providerId,
      parsedWithdrawRequestLog.args.requesterId
    );
    // walletInd is guaranteed to not be 0 in this case (contract doesn't allow
    // the caller to request withdrawals from non-authorized wallets).
    // We need to derive the wallet to send its entire content.
    const reservedWallet = deriveWalletFromPath(providerKeys.mnemonics, `m/0/0/${walletInd}`);

    const gasPrice = await waffle.provider.getGasPrice();
    // The node calculates how much gas the next transaction will cost (53,654)
    const gasCost = await chainApi
      .connect(reservedWallet)
      .estimateGas.fulfillWithdraw(parsedWithdrawRequestLog.args.withdrawRequestId, {
        // We need to send some funds for the gas price calculation to be correct
        value: 1,
      });
    const txCost = gasCost.mul(gasPrice);
    // We set aside some ETH to pay for the gas of the following transaction,
    // send all the rest along with the transaction. The contract will direct
    // these funds to the destination given at the request.
    const reservedWalletBalance = await waffle.provider.getBalance(reservedWallet.getAddress());
    const fundsToSend = reservedWalletBalance.sub(txCost);

    // Note that we're using reservedWallet to call this
    await chainApi.connect(reservedWallet).fulfillWithdraw(parsedWithdrawRequestLog.args.withdrawRequestId, {
      gasLimit: gasCost,
      gasPrice: gasPrice,
      value: fundsToSend,
    });
    // Even after estimating the gas cost, there seems to be some dust left in
    // the wallet. Then it may make sense to just call the gas cost a round
    // 60,000 instead of making an extra call to the Ethereum node to estimate
    // the gas cost.
    // This final fulfillWithdraw() emits a WithdrawFulfilled event, which the
    // node can use to tell if it has already served a WithdrawRequested event.
    // So we are using the same oracle request-fulfill pattern yet again.
  }
});
