/* global ethers, waffle */
const { expect } = require('chai');

describe('Airnode', function () {
  let accounts;
  let airnode;
  let convenience;
  let airnodeClient;

  beforeEach(async () => {
    const airnodeFactory = await ethers.getContractFactory('Airnode');
    airnode = await airnodeFactory.deploy();
    const convenienceFactory = await ethers.getContractFactory('Convenience');
    convenience = await convenienceFactory.deploy(airnode.address);
    const accountList = await ethers.getSigners();
    accounts = {
      providerAdmin: accountList[0],
      requesterAdmin: accountList[1],
    };
  });

  it('works', async function () {
    // The requesters need to deposit at least walletDesignationDeposit ETH to have
    // a wallet reserved. The node uses this to automatically make a transaction
    // that authorizes the reserved wallet address to fulfill requests, and
    // deposits the rest to the reserved wallet.
    const walletDesignationDeposit = ethers.utils.parseEther('0.05');
    // The requesters need to have at least minBalance at their reserved wallet
    // to have a request fulfilled.
    const minBalance = ethers.utils.parseEther('0.025');
    // After sign up, ChainAPI has the provider make a transaction to create
    // a provider record at the contract and get assigned an ID.
    const providerId = await createProvider(walletDesignationDeposit, minBalance);

    // The provider generates the OIS that integrates their API to an endpoint
    // using ChainAPI.

    // The provider clicks FINALIZE at the endpoint list, which has them make
    // a transaction to create an endpoint record at the contract and assign
    // an ID to it.
    const endpointId = await createEndpoint(providerId);

    // The provider initiates a deployment, which creates a config.json file
    // in which this endpointId is used. The provider deploys the node. The node
    // generates keys for the provider and stores them at SSM. They send us
    // xpub and designatorAddress over the API (actually we only need xpub
    // and can derive designatorAddress from that with path m/0/0/0).
    const providerKeys = await generateProviderKey();

    // After they have deployed the node, the provider has to come back to ChainAPI
    // to do the transaction below to announce their extended public key. We will have
    // received these through the API so we can fill in the arguments for them.
    await initializeProviderKey(providerId, providerKeys.xpub, providerKeys.designatorAddress);

    // After sign up, ChainAPI has the requester make a transaction to create
    // a requester record at the contract and get assigned an ID.
    const requesterId = await createRequester();

    // The requester reserves a wallet from the provider.
    const { walletInd, depositAmount, walletDesignationRequestId } = await requestWalletDesignation(
      providerId,
      requesterId,
      walletDesignationDeposit
    );
    // Note that the requester only received the index of the wallet here, and
    // not the wallet address. This is because we can't derive the wallet address
    // on-chain (because it's computationally intensive). See deriveWalletAddressFromIndex()
    // for how it's done off-chain. We will run that as soon as the reservation
    // transaction goes through and tell the requester what their reserved wallet address
    // is.

    // The node was listening for wallet designation events, and will authorize the
    // corresponding address with designatorAddress automatically.
    await designateWallet(providerId, requesterId, providerKeys, walletInd, depositAmount, walletDesignationRequestId);

    // The requester deploys a client contract. The client contract needs two arguments:
    // Airnode addres: I make my requests here
    // requesterId: I belong to this guy so let him decide for me
    const airnodeClientFactory = await ethers.getContractFactory('ExampleAirnodeClient');
    airnodeClient = await airnodeClientFactory.deploy(airnode.address, requesterId);

    // The requester introduces the client contract to Airnode contract as one
    // of its own. This means that the requests made by the client contract will
    // be funded by the requester's reserved wallet.
    await endorseClient(requesterId, airnodeClient.address);
    // Note that this would have reverted if the client didn't announce
    // requesterId as its potential endorser. This is because we don't want
    // random people to endorse a client contract, then underfund their reserved
    // wallets to deny the client service. So clients should only announce
    // trusted requesters as potential endorsers.

    // The requester creates a request template, telling which endpoint to call
    // and what parameters to use. The parameters defined at this stage are
    // static, doesn't change between requests.
    const templateId = await createTemplate(providerId, endpointId, ethers.utils.randomBytes(8));

    // Someone calls the client contract, which triggers a request.
    // We have additional parameters here, determined at request-time.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const requestId = await makeRequest(templateId, ethers.utils.randomBytes(4));

    // The provider node has been listening for events from the Airnode contract
    // so the request will see and fulfill it.
    await fulfill(providerId, providerKeys);

    // We got our response!
    console.log(ethers.utils.parseBytes32String(await airnodeClient.data()));

    // Now the requester wants the amount deposited at their reserved wallet back
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const withdrawalRequestId = await createWithdrawalRequest(
      providerId,
      requesterId,
      accounts.requesterAdmin.getAddress()
    );

    // Similar to the oracle request, the provider node has been listening for this
    // and fulfills it
    await fulfillWithdrawalRequest(providerId, providerKeys);

    // So the node is listening for three kind of requests
    // 1 - Listens for wallet designation requests and responds to them by
    // designating the wallet's address with its designatorAddress
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

  async function createProvider(walletDesignationDeposit, minBalance) {
    const tx = await airnode
      .connect(accounts.providerAdmin)
      .createProvider(await accounts.providerAdmin.getAddress(), walletDesignationDeposit, minBalance);
    // Get the newly created provider's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    const providerId = parsedLog.args.providerId;
    return providerId;
  }

  async function createEndpoint(providerId) {
    // The second argument [] here is the list of Authorizer contracts for the
    // endpoint. An Authorizer contract decides if a requester address is allowed
    // to make a request to a specific endpoint (depending on whitelist, payment, etc.).
    // It is left empty because Authorizers are not implemented yet, which means that
    // this endpoint is public.
    // Note that we are assigning a random bytes32 as the apiId, because we don't
    // really care about what it is here. The Authorizer will use this API ID
    // to bundle the endpoints from the same API together.
    const tx = await airnode
      .connect(accounts.providerAdmin)
      .createEndpoint(
        providerId,
        ethers.BigNumber.from(ethers.utils.randomBytes(32)),
        [ethers.constants.AddressZero]
        );
    // Get the newly created endpoint's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    const endpointId = parsedLog.args.endpointId;
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
    // it is used to call ProviderStore to designate reserved wallet addresses
    // to fulfill requests.
    const designatorWallet = hdNode.derivePath(`m/0/0/0`);
    return {
      mnemonics: wallet.mnemonic.phrase,
      xpub: xpub,
      designatorAddress: designatorWallet.address,
    };
  }

  async function initializeProviderKey(providerId, xpub, designatorAddress) {
    airnode.connect(accounts.providerAdmin).initializeProviderKeys(providerId, xpub, designatorAddress);
  }

  async function createRequester() {
    const tx = await airnode.connect(accounts.requesterAdmin).createRequester(accounts.requesterAdmin.getAddress());
    // Get the newly created requester's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    const requesterId = parsedLog.args.requesterId;
    return requesterId;
  }

  async function requestWalletDesignation(providerId, requesterId, walletDesignationDeposit) {
    // Note that the requester sends walletDesignationDeposit amount of ETH along with
    // this transaction. The contract sends it to designatorAddress of the provider,
    // which will make a transaction to designate the newly reserved wallet to
    // fulfill requests for this provider. Then, designatorAddress will send the rest
    // of the funds to the newly reserved wallet address. This means that the requester
    // can send more than walletDesignationDeposit along with this transaction to reserve
    // a wallet and fund it in a single transaction.
    const tx = await airnode
      .connect(accounts.requesterAdmin)
      .requestWalletDesignation(providerId, requesterId, { value: walletDesignationDeposit });
    // Get the newly reserved wallet's index from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    const walletInd = parsedLog.args.walletInd;
    // The node needs to get depositAmount from the event in case the requester
    // sent more than walletDesignationDeposit (which is not the case here).
    const depositAmount = parsedLog.args.depositAmount;
    const walletDesignationRequestId = parsedLog.args.walletDesignationRequestId;
    return { walletInd, depositAmount, walletDesignationRequestId };
  }

  async function designateWallet(
    providerId,
    requesterId,
    providerKeys,
    walletInd,
    depositAmount,
    walletDesignationRequestId
  ) {
    // We will authorize this address
    const walletAddress = await deriveWalletAddressFromIndex(providerKeys.xpub, walletInd);
    // Now let's derive the private keys for designatorAddress because we need
    // to call the contract through the corresponding wallet. Note that
    // designatorAddress only has what the requester has sent while reserving
    // the wallet (0.05 ETH).
    const designatorWallet = deriveWalletFromPath(providerKeys.mnemonics, 'm/0/0/0');
    // The following transaction (fulfillWalletDesignation()) takes 126,796 gas.
    // We will leave some slack (in case a block gets uncled and transactions
    // revert, or gas costs of operations increase with a fork) and say it's
    // 150,000.
    const gasCost = ethers.BigNumber.from(150000);
    const gasPrice = await waffle.provider.getGasPrice();
    // The requester sent 0.05 ETH to have their wallet authorized. We use
    // 0.0008 ETH for the transaction (gasCost x gasPrice) and send the remaining
    // 0.0492 ETH to their newly reserved wallet.
    const txCost = gasCost.mul(gasPrice);
    const fundsToSend = depositAmount.sub(txCost);
    airnode.connect(designatorWallet).fulfillWalletDesignation(walletDesignationRequestId, walletAddress, {
      gasLimit: gasCost,
      gasPrice: gasPrice,
      value: fundsToSend,
    });

    // This transaction emits an event. The node uses this event to be able to
    // tell that it has already designated a wallet and doesn't try
    // again (so very similar to an oracle request-response pattern).
    // At this point, we have very little ETH left in designatorWallet, but the
    // next requester reserving a wallet will fund it with 0.05 ETH again.
  }

  function deriveWalletFromPath(mnemonics, path) {
    // This is function that the node uses to derive the private key of an
    // arbitrary wallet path.
    const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonics);
    const designatorHdNode = masterHdNode.derivePath(path);
    return new ethers.Wallet(designatorHdNode.privateKey, waffle.provider);
  }

  async function deriveWalletAddressFromIndex(xpub, walletInd) {
    // This is function that anyone can use to derive the address of an arbitrary
    // wallet index. That's because xpub is announced publicly at the contract
    // by the provider.
    const hdNode = ethers.utils.HDNode.fromExtendedKey(xpub);
    // We can reserve 2^256-1 different wallets as below
    // m/0/0/0: designatorAddress
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
    airnode.connect(accounts.requesterAdmin).endorseClient(requesterId, clientAddress);
  }

  async function createTemplate(providerId, endpointId, staticParameters) {
    // Note that we are not connecting to the contract as requesterAdmin.
    // That's because it doesn't matter who creates the template.
    const tx = await airnode.createTemplate(
      providerId,
      endpointId,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero,
      ethers.utils.arrayify('0x00000000'),
      ethers.utils.arrayify('0x00000000'),
      staticParameters
    );
    // Get the newly created template's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    const templateId = parsedLog.args.templateId;
    return templateId;
  }

  async function makeRequest(templateId, dynamicParameters) {
    const tx = await airnodeClient.request(templateId, dynamicParameters);
    // Get the newly created template's ID from the event. Note that we are
    // listening from Airnode and not Client, because that's where the event
    // is emitted.
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
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

  async function fulfill(providerId, providerKeys) {
    // The provider node can get all events that concern it with a single call.
    const providerLogs = await waffle.provider.getLogs({
      address: airnode.address,
      fromBlock: 0, // This would be block number from ~1 hour ago
      topics: [null, providerId],
    });
    const parsedProviderLogs = providerLogs.map((providerLog) => airnode.interface.parseLog(providerLog));
    // Although that's super cool, we're only interested in the oracle request events here
    const parsedRequestLog = parsedProviderLogs.filter(
      (parsedProviderLog) => parsedProviderLog.name == 'RequestMade'
    )[0];
    // The node has the templateId now, let's fetch the endpointId and static parameters
    const templateLogs = await waffle.provider.getLogs({
      address: airnode.address,
      fromBlock: 0,
      topics: [
        ethers.utils.id('TemplateCreated(bytes32,bytes32,bytes32,address,address,bytes4,bytes4,bytes)'),
        parsedRequestLog.args.templateId,
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const parsedTemplateLog = airnode.interface.parseLog(templateLogs[0]);

    // Check if the requester is authorized to call the endpoint
    const authorizationStatus = await airnode.checkAuthorizationStatus(
      parsedTemplateLog.args.endpointId,
      parsedRequestLog.args.requester
    );
    expect(authorizationStatus).to.equal(true);

    // Now the node has the endpointId from parsedTemplateLog, it can
    // look through config.json to find which API operation to call. Then, it
    // decodes the static request parameters defined in parsedTemplateLog.parameters,
    // the dynamic request parameters defined in parsedRequestLog.parameters,
    // insert these to correct fields and make the API call. After it gets the
    // response, it processes it according to the reserved integration parameters
    // (_path, _times, _type) and fulfills the request with the outcome.

    // To fulfill, it will first have to derive the private key for the wallet
    // reserved by the requester.
    const { walletInd } = await convenience.getDataWithClientAddress(providerId, parsedRequestLog.args.requester);
    // If walletInd was 0 here, that would have meant that the client making
    // the request isn't endorser by a requester with a reserved wallet and
    // shouldn't be responded to. Fortunately we got 1.
    const reservedWallet = deriveWalletFromPath(providerKeys.mnemonics, `m/0/0/${walletInd}`);
    // The node fulfills the request with the derived wallet.
    await airnode
      .connect(reservedWallet)
      .fulfill(
        parsedRequestLog.args.requestId,
        ethers.utils.formatBytes32String('Hello!'),
        parsedRequestLog.args.fulfillAddress,
        parsedRequestLog.args.fulfillFunctionId,
        {
          gasLimit: 500000, // For some reason, the default gas limit is too high
          // 500000 is a safe value and we can allow the requester to set this
          // with a _gasLimit reserved parameter (for example, if they want to run
          // a very gas-heavy aggregation method)
        }
      );
  }

  async function createWithdrawalRequest(providerId, requesterId, destination) {
    // Only the requester admin can do this
    const tx = await airnode.connect(accounts.requesterAdmin).requestWithdrawal(providerId, requesterId, destination);
    // Get the newly created withdrawal request's ID from the event
    const log = (await waffle.provider.getLogs({ address: airnode.address })).filter(
      (log) => log.transactionHash === tx.hash
    )[0];
    const parsedLog = airnode.interface.parseLog(log);
    const withdrawalRequestId = parsedLog.args.withdrawalRequestId;
    return withdrawalRequestId;
  }

  async function fulfillWithdrawalRequest(providerId, providerKeys) {
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

    const walletInd = await airnode.getProviderWalletIndWithRequesterId(
      providerId,
      parsedWithdrawalRequestLog.args.requesterId
    );
    // walletInd is guaranteed to not be 0 in this case (contract doesn't allow
    // the caller to request withdrawals from non-designated wallets).
    // We need to derive the wallet to send its entire content.
    const reservedWallet = deriveWalletFromPath(providerKeys.mnemonics, `m/0/0/${walletInd}`);

    const gasPrice = await waffle.provider.getGasPrice();
    // The node calculates how much gas the next transaction will cost (53,654)
    const gasCost = await airnode
      .connect(reservedWallet)
      .estimateGas.fulfillWithdrawal(parsedWithdrawalRequestLog.args.withdrawalRequestId, {
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
    await airnode.connect(reservedWallet).fulfillWithdrawal(parsedWithdrawalRequestLog.args.withdrawalRequestId, {
      gasLimit: gasCost,
      gasPrice: gasPrice,
      value: fundsToSend,
    });
    // Even after estimating the gas cost, there seems to be some dust left in
    // the wallet. Then it may make sense to just call the gas cost a round
    // 60,000 instead of making an extra call to the Ethereum node to estimate
    // the gas cost.
    // This final fulfillWithdrawal() emits a WithdrawalFulfilled event, which the
    // node can use to tell if it has already served a WithdrawalRequested event.
    // So we are using the same oracle request-fulfill pattern yet again.
  }
});
