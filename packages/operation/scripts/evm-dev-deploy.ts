import '@nomiclabs/hardhat-ethers';
import { encode } from '@airnode/airnode-abi';
import { ethers } from 'hardhat';
import { Contract, providers, Wallet } from 'ethers';
import deployConfig from '../config/evm-dev-deploy.json';
import requesterConfig from '../config/evm-dev-requesters.json';

// Types
interface DesignatedWallet {
  address: string;
  apiProviderName: string;
  wallet: Wallet;
}

interface RequesterAccount {
  address: string;
  designatedWallets: DesignatedWallet[];
  requesterIndex: string;
  signer: providers.JsonRpcSigner | Wallet;
}

interface ApiProvider {
  address: string;
  mnemonic: string;
  signer: providers.JsonRpcSigner | Wallet;
  xpub: string;
}

interface Template {
  apiProviderName: string;
  onchainTemplateId: string;
}

// Contracts
let airnode: Contract;
let convenience: Contract;
const authorizersByName: { [name: string]: string } = {};
const clientsByName: { [name: string]: Contract } = {};

// General
let deployer: providers.JsonRpcSigner;
let ethProvider: providers.JsonRpcProvider;

const apiProvidersByName: { [name: string]: ApiProvider } = {};
const requestersById: { [name: string]: RequesterAccount } = {};
const templatesByName: { [name: string]: Template } = {};

async function deployContracts() {
  const Airnode = await ethers.getContractFactory('Airnode', deployer);
  airnode = await Airnode.deploy();
  await airnode.deployed();

  const Convenience = await ethers.getContractFactory('Convenience', deployer);
  convenience = await Convenience.deploy(airnode.address);
  await convenience.deployed();

  for (const clientName of Object.keys(deployConfig.clients)) {
    const MockClient = await ethers.getContractFactory(clientName, deployer);
    const mockClient = await MockClient.deploy(airnode.address);
    await mockClient.deployed();
    clientsByName[clientName] = mockClient;
  }

  for (const authorizerName of Object.keys(deployConfig.authorizers)) {
    // @ts-ignore TODO add types
    const authorizerValue = deployConfig.authorizers[authorizerName];
    if (authorizerValue.startsWith('0x')) {
      authorizersByName[authorizerName] = authorizerValue;
      continue;
    }
    const Authorizer = await ethers.getContractFactory(authorizerName, deployer);
    const authorizer = await Authorizer.deploy(airnode.address);
    await authorizer.deployed();
    authorizersByName[authorizerName] = authorizer.address;
  }
}

function deriveExtendedPublicKey(mnemonic: string) {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
}

function deriveProviderId(apiProvider: ApiProvider) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [apiProvider.address]));
}

async function assignAccounts() {
  for (const providerName of Object.keys(deployConfig.apiProviders)) {
    // @ts-ignore TODO Add types
    const apiProvider = deployConfig.apiProviders[providerName];
    const providerAdminWallet = deriveWalletFromPath(apiProvider.mnemonic, 'm');
    const providerAdminAddress = providerAdminWallet.address;
    const xpub = deriveExtendedPublicKey(apiProvider.mnemonic);
    apiProvidersByName[providerName] = {
      address: providerAdminAddress,
      mnemonic: apiProvider.mnemonic,
      signer: providerAdminWallet,
      xpub,
    };
  }

  // Start assigning signers from index 1. These accounts are already funded
  let signerIndex = 1;
  for (const configRequester of requesterConfig.requesters) {
    const requesterSigner = ethProvider.getSigner(signerIndex);
    const requesterAddress = await requesterSigner.getAddress();

    const tx = await airnode.connect(deployer).createRequester(requesterAddress);
    const logs = await ethProvider.getLogs({ address: airnode.address });
    const log = logs.find((log) => log.transactionHash === tx.hash);
    const parsedLog = airnode.interface.parseLog(log!);
    const requesterIndex = parsedLog.args.requesterIndex;

    requestersById[configRequester.id] = {
      address: requesterAddress,
      designatedWallets: [],
      requesterIndex,
      signer: requesterSigner,
    };

    signerIndex += 1;
  }
}

async function createProviders() {
  for (const apiProviderName of Object.keys(apiProvidersByName)) {
    const apiProvider = apiProvidersByName[apiProviderName];

    // Ensure that the API provider address has enough ETH to create the onchain provider
    await deployer.sendTransaction({ to: apiProvider.address, value: ethers.utils.parseEther('5') });

    await airnode
      .connect(apiProvider.signer)
      .createProvider(apiProvider.address, apiProvider.xpub, { value: ethers.utils.parseEther('1') });
  }
}

async function authorizeEndpoints() {
  for (const providerName of Object.keys(apiProvidersByName)) {
    // @ts-ignore TODO Add types
    const configApiProvider = deployConfig.apiProviders[providerName];
    const apiProvider = apiProvidersByName[providerName];
    const providerId = deriveProviderId(apiProvider);

    for (const endpointName of Object.keys(configApiProvider.endpoints)) {
      // @ts-ignore TODO Add types
      const configEndpoint = configApiProvider.endpoints[endpointName];
      const { keccak256, defaultAbiCoder } = ethers.utils;
      const endpointId = keccak256(defaultAbiCoder.encode(['string'], [endpointName]));

      const authorizerAddresses = configEndpoint.authorizers.reduce((acc: string[], authorizerName: string) => {
        const address = authorizersByName[authorizerName];
        return [...acc, address];
      }, []);

      // Ethers can't estimate a gas limit here so just set it really high
      await airnode
        .connect(apiProvider.signer)
        .updateEndpointAuthorizers(providerId, endpointId, authorizerAddresses, { gasLimit: 8500000 });
    }
  }
}

function deriveWalletFromPath(mnemonic: string, path: string) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, ethProvider);
}

async function assignDesignatedWallets() {
  for (const configRequester of requesterConfig.requesters) {
    const requester = requestersById[configRequester.id];

    for (const apiProviderName of Object.keys(configRequester.apiProviders)) {
      // @ts-ignore TODO add types
      const apiProvider = apiProvidersByName[apiProviderName];
      const wallet = deriveWalletFromPath(apiProvider.mnemonic, `m/0/0/${requester.requesterIndex}`);

      requester.designatedWallets.push({
        address: wallet.address,
        apiProviderName: apiProviderName,
        wallet,
      });
    }
  }
}

async function fundDesignatedWallets() {
  for (const configRequester of requesterConfig.requesters) {
    const requester = requestersById[configRequester.id];

    for (const designatedWallet of requester.designatedWallets) {
      // @ts-ignore TODO add types
      const configApiProvider = configRequester.apiProviders[designatedWallet.apiProviderName];
      if (!configApiProvider) {
        continue;
      }
      const value = ethers.utils.parseEther(configApiProvider.ethBalance);
      const to = designatedWallet.address;
      await deployer.sendTransaction({ to, value });
    }
  }
}

async function endorseClients() {
  for (const clientName of Object.keys(deployConfig.clients)) {
    // @ts-ignore TODO add types
    const configClient = deployConfig.clients[clientName];
    const client = clientsByName[clientName];

    for (const requesterId of configClient.endorsers) {
      const requester = requestersById[requesterId];

      await airnode
        .connect(requester.signer)
        .updateClientEndorsementStatus(requester.requesterIndex, client.address, true);
    }
  }
}

async function createTemplates() {
  for (const apiProviderName of Object.keys(apiProvidersByName)) {
    const apiProvider = apiProvidersByName[apiProviderName];
    // @ts-ignore TODO add types
    const configApiProvider = deployConfig.apiProviders[apiProviderName];
    const providerId = deriveProviderId(apiProvider);

    for (const templateName of Object.keys(configApiProvider.templates)) {
      // @ts-ignore TODO: add types
      const configTemplate = configApiProvider.templates[templateName];
      const client = clientsByName[configTemplate.fulfillClient];
      const requester = requestersById[configTemplate.requester];
      const designatedWallet = requester.designatedWallets.find((w) => w.apiProviderName === apiProviderName);

      const { keccak256, defaultAbiCoder } = ethers.utils;
      const endpointId = keccak256(defaultAbiCoder.encode(['string'], [configTemplate.endpoint]));

      const tx = await airnode.createTemplate(
        providerId,
        endpointId,
        requester.requesterIndex,
        designatedWallet!.address,
        client.address,
        client.interface.getSighash('fulfill(bytes32,uint256,bytes32)'),
        encode(configTemplate.parameters)
      );
      const logs = await ethProvider.getLogs({ address: airnode.address });
      const log = logs.find((log) => log.transactionHash === tx.hash);
      const parsedLog = airnode.interface.parseLog(log!);
      const templateId = parsedLog.args.templateId;

      templatesByName[templateName] = {
        apiProviderName,
        onchainTemplateId: templateId,
      };
    }
  }
}

async function main() {
  ethProvider = ethers.provider;
  deployer = ethProvider.getSigner(0);

  console.log('Deploying contracts...');
  await deployContracts();

  console.log('Assigning provider and requester accounts...');
  await assignAccounts();

  console.log('Creating API providers...');
  await createProviders();

  console.log('Assigning designated wallets to requesters...');
  await assignDesignatedWallets();

  console.log('Funding designated wallets...');
  await fundDesignatedWallets();

  console.log('Authorizing endpoints...');
  await authorizeEndpoints();

  console.log('Endorsing clients...');
  await endorseClients();

  console.log('Creating templates...');
  await createTemplates();

  console.log('\n=======================CONTRACTS=======================');
  console.log('AIRNODE ADDRESS:    ', airnode.address);
  console.log('CONVENIENCE ADDRESS:', convenience.address);
  console.log('=======================CONTRACTS=======================');

  console.log('\n=======================CLIENTS=======================');
  const clientNames = Object.keys(clientsByName);
  for (const [index, clientName] of clientNames.entries()) {
    const client = clientsByName[clientName];
    console.log(`CLIENT NAME: ${clientName}`);
    console.log(`ADDRESS    : ${client.address}`);
    if (index + 1 < clientNames.length) {
      console.log('-------------------------------------------------------');
    }
  }
  console.log('=======================CLIENTS=======================');

  console.log('\n=======================TEMPLATES=======================');
  const templateNames = Object.keys(templatesByName);
  for (const [index, templateName] of templateNames.entries()) {
    const template = templatesByName[templateName];
    console.log(`TEMPLATE NAME: ${templateName}`);
    console.log(`API PROVIDER : ${template.apiProviderName}`);
    console.log(`ONCHAIN ID:    ${template.onchainTemplateId}`);
    if (index + 1 < templateNames.length) {
      console.log('-------------------------------------------------------');
    }
  }
  console.log('=======================TEMPLATES=======================');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
