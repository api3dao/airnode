import '@nomiclabs/hardhat-ethers';
import { encode } from '@airnode/airnode-abi';
import { ethers } from 'hardhat';
import { Contract, providers, Wallet } from 'ethers';
import config from '../deploy-evm-dev.json';

// Types
interface DesignatedWallet {
  address: string;
  requesterIndex: string;
  wallet: Wallet;
}

interface RequesterAccount {
  address: string;
  designatedWallet: DesignatedWallet | null;
  requesterIndex: string | null;
  signer: providers.JsonRpcSigner | Wallet;
}

interface ApiProvider {
  address: string;
  mnemonic: string;
  requestersByName: { [name: string]: RequesterAccount };
  signer: providers.JsonRpcSigner | Wallet;
  xpub: string;
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
// const templatesByName: { [name: string]: string } = {};

async function deployContracts() {
  const Airnode = await ethers.getContractFactory('Airnode', deployer);
  airnode = await Airnode.deploy();
  await airnode.deployed();

  const Convenience = await ethers.getContractFactory('Convenience', deployer);
  convenience = await Convenience.deploy(airnode.address);
  await convenience.deployed();

  for (const clientName of Object.keys(config.clients)) {
    const MockClient = await ethers.getContractFactory(clientName, deployer);
    const mockClient = await MockClient.deploy(airnode.address);
    await mockClient.deployed();
    clientsByName[clientName] = mockClient;
  }

  for (const authorizerName of Object.keys(config.authorizers)) {
    // @ts-ignore Add types
    const authorizerValue = config.authorizers[authorizerName];
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

async function assignAccounts() {
  for (const providerName of Object.keys(config.apiProviders)) {
    // @ts-ignore Add types
    const apiProvider = config.apiProviders[providerName];
    const providerAdminWallet = deriveWalletFromPath(apiProvider.mnemonic, 'm');
    const providerAdminAddress = await providerAdminWallet.getAddress();
    const xpub = deriveExtendedPublicKey(apiProvider.mnemonic);
    apiProvidersByName[providerName] = {
      address: providerAdminAddress,
      mnemonic: apiProvider.mnemonic,
      requestersByName: {},
      signer: providerAdminWallet,
      xpub,
    };
  }

  // Start assigning signers from index 1. These accounts are already funded
  let signerIndex = 1;
  for (const requesterName of Object.keys(config.requesters)) {
    // @ts-ignore Add types
    const requester = config.requesters[requesterName];

    for (const configApiProvider of requester.apiProviders) {
      // @ts-ignore Add types
      const apiProvider = apiProvidersByName[configApiProvider.name];
      const requesterSigner = ethProvider.getSigner(signerIndex);
      const requesterAddress = await requesterSigner.getAddress();
      apiProvider.requestersByName[requesterName] = {
        signer: requesterSigner,
        address: requesterAddress,
        designatedWallet: null,
        requesterIndex: null,
      };
      signerIndex += 1;
    }
  }
}

async function createProviders() {
  for (const apiProviderName of Object.keys(apiProvidersByName)) {
    const apiProvider = apiProvidersByName[apiProviderName];
    const value = ethers.utils.parseEther('1');
    await airnode.connect(deployer).createProvider(apiProvider.address, apiProvider.xpub, { value });
  }
}

// async function createAndAuthorizeEndpoints() {
//   for (const providerName of Object.keys(apiProvidersByName)) {
//     // @ts-ignore Add types
//     const { endpoints } = config.apiProviders[providerName];
//     const apiProvider = apiProvidersByName[providerName];
//     const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [apiProvider.address]));
//
//     for (const endpoint of endpoints) {
//       const { keccak256, defaultAbiCoder } = ethers.utils;
//       const endpointId = keccak256(defaultAbiCoder.encode(['string'], [endpoint.name]));
//
//       const authorizerAddresses = endpoint.authorizers.reduce((acc: string[], authorizerName: string) => {
//         const address = authorizersByName[authorizerName];
//         return [...acc, address];
//       }, []);
//
//       await airnode.connect(apiProvider.signer).updateEndpointAuthorizers(providerId, endpointId, authorizerAddresses);
//     }
//   }
// }

function deriveWalletFromPath(mnemonic: string, path: string) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, ethProvider);
}

async function assignDesignatedWallets() {
  for (const apiProviderName of Object.keys(apiProvidersByName)) {
    const apiProvider = apiProvidersByName[apiProviderName];

    for (const requesterName of Object.keys(apiProvider.requestersByName)) {
      const requester = apiProvider.requestersByName[requesterName];
      const tx = await airnode.connect(apiProvider.signer).createRequester(requester.address);
      const logs = await ethProvider.getLogs({ address: airnode.address });
      const log = logs.find((log) => log.transactionHash === tx.hash);
      const parsedLog = airnode.interface.parseLog(log!);
      const requesterIndex = parsedLog.args.requesterInd;
      const wallet = deriveWalletFromPath(apiProvider.mnemonic, `m/0/0/${requesterIndex}`);
      requester.designatedWallet = {
        requesterIndex,
        wallet,
        address: wallet.address,
      };
    }
  }
}

async function fundDesignatedWallets() {
  for (const requesterName of Object.keys(config.requesters)) {
    // @ts-ignore
    const configRequester = config.requesters[requesterName];

    for (const configApiProvider of configRequester.apiProviders) {
      const requester = apiProvidersByName[configApiProvider.name];
      const value = ethers.utils.parseEther(configApiProvider.ethBalance);
      const to = requester.address;
      await deployer.sendTransaction({ to, value });
    }
  }
}

async function endorseRequesterClients() {
  for (const clientName of Object.keys(config.clients)) {
    const client = clientsByName[clientName];
    const account = accounts[index];
    const requester = config.requesters[index];
    const clientNames = Object.keys(requester.clients);

    for (const clientName of clientNames) {
      const contract = clients[clientName];
      // TODO: add types
      // @ts-ignore
      const client = requester.clients[clientName];
      await airnode
        .connect(account.signer)
        .updateClientEndorsementStatus(designatedWallet.requesterIndex, contract.address, client.endorsed);
    }
  }
}

// async function createTemplates() {
//   const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [providerAdmin.address]));
//
//   for (const [index, designatedWallet] of designatedWallets.entries()) {
//     const requester = config.requesters[index];
//
//     for (const clientName of Object.keys(requester.clients)) {
//       // TODO: add types
//       // @ts-ignore
//       const client = requester.clients[clientName];
//       const clientContract = clients[clientName];
//
//       for (const template of client.templates) {
//         const { keccak256, defaultAbiCoder } = ethers.utils;
//         const endpointId = keccak256(defaultAbiCoder.encode(['string'], [template.endpointName]));
//         const tx = await airnode.createTemplate(
//           providerId,
//           endpointId,
//           designatedWallet.requesterIndex,
//           designatedWallet.address,
//           clientContract.address,
//           clientContract.interface.getSighash('fulfill(bytes32,uint256,bytes32)'),
//           encodeMap(template.parameters)
//         );
//         const logs = await provider.getLogs({ address: airnode.address });
//         const log = logs.find((log) => log.transactionHash === tx.hash);
//         const parsedLog = airnode.interface.parseLog(log!);
//         const onchainTemplateId = parsedLog.args.templateId;
//         templateAddressesById[template.id] = onchainTemplateId;
//       }
//     }
//   }
// }
//
// async function makeShortRequests() {
//   for (const requester of config.requesters) {
//     for (const clientName of Object.keys(requester.clients)) {
//       // TODO: add types
//       // @ts-ignore
//       const client = requester.clients[clientName];
//       const clientContract = clients[clientName];
//
//       for (const request of client.shortRequests) {
//         const templateAddress = templateAddressesById[request.templateId];
//         // TODO: add types
//         // @ts-ignore
//         const template = client.templates.find((t) => t.id === request.templateId);
//         const encodedParameters = encodeMap(template.parameters);
//         await clientContract.makeShortRequest(templateAddress, encodedParameters);
//       }
//     }
//   }
// }

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

  console.log('Endorsing requester clients...');
  await endorseRequesterClients();
  // await createTemplates();

  console.log('Protocol deployed to:', airnode.address);
  console.log('Convenience deployed to:', convenience.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
