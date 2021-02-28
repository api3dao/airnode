const { expect } = require('chai');

let airnode;
let roles;
const requesterIndex = 1;
let providerXpub, providerId, masterWallet, designatedWallet;

beforeEach(async () => {
  const accounts = await ethers.getSigners();
  roles = {
    deployer: accounts[0],
    providerAdmin: accounts[1],
    requesterAdmin: accounts[2],
    randomPerson: accounts[9],
  };
  const airnodeFactory = await ethers.getContractFactory('Airnode', roles.deployer);
  airnode = await airnodeFactory.deploy();
  // Create the requester
  await airnode.connect(roles.requesterAdmin).createRequester(roles.requesterAdmin.address);
  // Generate the provider private key and derive the related parameters
  const providerWallet = ethers.Wallet.createRandom();
  const providerMnemonic = providerWallet.mnemonic.phrase;
  const hdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  providerXpub = hdNode.neuter().extendedKey;
  masterWallet = new ethers.Wallet(hdNode.privateKey, waffle.provider);
  providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [masterWallet.address]));
  designatedWallet = ethers.Wallet.fromMnemonic(providerMnemonic, `m/0/${requesterIndex}`).connect(waffle.provider);
  // Fund the provider master wallet for it to be able to set the provider parameters
  await roles.providerAdmin.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('1'),
  });
});

describe('setProviderParametersAndForwardFunds', function () {
  context('Called with non-zero value', async function () {
    context('Provider admin is payable', async function () {
      it('sets the provider parameters and forwards funds', async function () {
        // Generate random addresses as the authorizer contracts
        const authorizers = Array.from({ length: 5 }, () =>
          ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
        );
        // Estimate the gas required to set the provider parameters
        const gasEstimate = await airnode
          .connect(masterWallet)
          .estimateGas.setProviderParametersAndForwardFunds(roles.providerAdmin.address, providerXpub, authorizers, {
            value: 1,
          });
        // Calculate the amount that will be sent forwarded to the provider admin
        const gasPrice = await waffle.provider.getGasPrice();
        const txCost = gasEstimate.mul(gasPrice);
        const masterWalletBalance = await waffle.provider.getBalance(masterWallet.address);
        const fundsToSend = masterWalletBalance.sub(txCost);
        // Set the provider paramters
        const initialProviderAdminBalance = await waffle.provider.getBalance(roles.providerAdmin.address);
        const expectedProviderAdminBalance = initialProviderAdminBalance.add(fundsToSend);
        await expect(
          airnode
            .connect(masterWallet)
            .setProviderParametersAndForwardFunds(roles.providerAdmin.address, providerXpub, authorizers, {
              value: fundsToSend,
              gasLimit: gasEstimate,
              gasPrice: gasPrice,
            })
        )
          .to.emit(airnode, 'ProviderParametersSet')
          .withArgs(providerId, roles.providerAdmin.address, providerXpub, authorizers);
        expect(await waffle.provider.getBalance(roles.providerAdmin.address)).to.equal(expectedProviderAdminBalance);
      });
    });
    context('Provider admin is not payable', async function () {
      it('reverts', async function () {
        // Generate random addresses as the authorizer contracts
        const authorizers = Array.from({ length: 5 }, () =>
          ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
        );
        // Attempt to set the provider parameters and forward the funds (using airnode as it has no default payable method)
        await expect(
          airnode
            .connect(masterWallet)
            .setProviderParametersAndForwardFunds(airnode.address, providerXpub, authorizers, {
              value: 1,
              gasLimit: 500000,
            })
        ).to.be.revertedWith('Transfer failed');
      });
    });
  });
  context('Called with zero value', async function () {
    it('sets provider parameters', async function () {
      // Generate random addresses as the authorizer contracts
      const authorizers = Array.from({ length: 5 }, () =>
        ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
      );
      // Set the provider parameters
      const initialProviderAdminBalance = await waffle.provider.getBalance(roles.providerAdmin.address);
      await expect(
        airnode
          .connect(masterWallet)
          .setProviderParametersAndForwardFunds(roles.providerAdmin.address, providerXpub, authorizers, {
            gasLimit: 500000,
          })
      )
        .to.emit(airnode, 'ProviderParametersSet')
        .withArgs(providerId, roles.providerAdmin.address, providerXpub, authorizers);
      expect(await waffle.provider.getBalance(roles.providerAdmin.address)).to.equal(initialProviderAdminBalance);
    });
  });
});

describe('getProviderAndBlockNumber', function () {
  it('gets the provider and the block number', async function () {
    // Generate random addresses as the authorizer contracts
    const authorizers = Array.from({ length: 5 }, () =>
      ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
    );
    // Set provider parameters
    await airnode
      .connect(masterWallet)
      .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
    // Get the provider and verify its fields
    const providerAndBlockNumber = await airnode.getProviderAndBlockNumber(providerId);
    expect(providerAndBlockNumber.admin).to.equal(roles.providerAdmin.address);
    expect(providerAndBlockNumber.xpub).to.equal(providerXpub);
    expect(providerAndBlockNumber.authorizers).to.deep.equal(authorizers);
    expect(providerAndBlockNumber.blockNumber).to.equal(await waffle.provider.getBlockNumber());
  });
});

describe('getTemplates', function () {
  it('gets templates', async function () {
    // Create the templates
    const noTemplates = 10;
    const providerIds = Array.from({ length: noTemplates }, () => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const endpointIds = Array.from({ length: noTemplates }, () => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const parameters = Array.from({ length: noTemplates }, () => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const templateIds = [];
    for (let i = 0; i < noTemplates; i++) {
      templateIds.push(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes'],
            [providerIds[i], endpointIds[i], parameters[i]]
          )
        )
      );
      await airnode.createTemplate(providerIds[i], endpointIds[i], parameters[i]);
    }
    // Get the templates and verify them
    const templates = await airnode.getTemplates(templateIds);
    expect(templates.providerIds.length).to.equal(noTemplates);
    expect(templates.endpointIds.length).to.equal(noTemplates);
    expect(templates.parameters.length).to.equal(noTemplates);
    for (let i = 0; i < noTemplates; i++) {
      expect(templates.providerIds[i]).to.equal(providerIds[i]);
      expect(templates.endpointIds[i]).to.equal(endpointIds[i]);
      expect(templates.parameters[i]).to.equal(parameters[i]);
    }
  });
});

describe('checkAuthorizationStatuses', function () {
  context('Parameter lengths are equal', async function () {
    it('returns authorization statuses', async function () {
      const authorizers = [ethers.constants.AddressZero];
      // Set provider parameters
      await airnode
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Check authorization statuses
      const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const requesterIndex = 1;
      const clientAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
      const noRequests = 10;
      const authorizationStatuses = await airnode.checkAuthorizationStatuses(
        providerId,
        Array(noRequests).fill(requestId),
        Array(noRequests).fill(endpointId),
        Array(noRequests).fill(requesterIndex),
        Array(noRequests).fill(designatedWallet.address),
        Array(noRequests).fill(clientAddress)
      );
      for (const authorizationStatus of authorizationStatuses) {
        expect(authorizationStatus).to.equal(true);
      }
    });
  });
  context('Parameter lengths are not equal', async function () {
    it('reverts', async function () {
      const authorizers = [ethers.constants.AddressZero];
      // Set provider parameters
      await airnode
        .connect(masterWallet)
        .setProviderParameters(roles.providerAdmin.address, providerXpub, authorizers, { gasLimit: 500000 });
      // Check authorization statuses
      const requestId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const endpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      const requesterIndex = 1;
      const clientAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
      const noRequests = 10;
      await expect(
        airnode.checkAuthorizationStatuses(
          providerId,
          Array(noRequests - 1).fill(requestId),
          Array(noRequests).fill(endpointId),
          Array(noRequests).fill(requesterIndex),
          Array(noRequests).fill(designatedWallet.address),
          Array(noRequests).fill(clientAddress)
        )
      ).to.be.revertedWith('Parameter lengths must be equal');
    });
  });
});
