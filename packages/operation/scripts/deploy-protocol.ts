import '@nomiclabs/hardhat-ethers';
import { ethers } from 'hardhat';
import { Contract, providers, Wallet } from 'ethers';
// import { encodeMap } from 'cbor-custom';
import config from '../deploy-evm-dev.json';

// Types
interface RequesterAccount {
  address: string;
  requesterIndex: string;
  signer: providers.JsonRpcSigner | Wallet;
}

interface ApiProvider {
  address: string;
  requestersByName: { [name: string]: RequesterAccount };
  signer: providers.JsonRpcSigner | Wallet;
  xpub: string;
}

// interface DesignatedWallet {
//   address: string;
//   requesterIndex: string;
//   wallet: Wallet;
// }

// Contracts
let airnode: Contract;
let convenience: Contract;
// const clients: { [name: string]: Contract } = {};

// General
let deployer: providers.JsonRpcSigner;
let provider: providers.JsonRpcProvider;

const apiProvidersByName: { [name: string]: ApiProvider } = {};
const authorizersByName: { [name: string]: string } = {};
const clientsByName: { [name: string]: Contract } = {};
// const designatedWalletsByRequester: { [name: string]: DesignatedWallet };
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

    for (const providerName of requester.apiProviders) {
      // @ts-ignore Add types
      const apiProvider = config.apiProviders[providerName];
      const requesterSigner = provider.getSigner(signerIndex);
      const requesterAddress = await requesterSigner.getAddress();
      apiProvider[requesterName] = { signer: requesterSigner, address: requesterAddress };
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

async function createAndAuthorizeEndpoints() {
  for (const providerName of Object.keys(apiProvidersByName)) {
    // @ts-ignore Add types
    const { endpoints } = config.apiProviders[providerName];
    const apiProvider = apiProvidersByName[providerName];
    const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [apiProvider.address]));

    for (const endpoint of endpoints) {
      const { keccak256, defaultAbiCoder } = ethers.utils;
      const endpointId = keccak256(defaultAbiCoder.encode(['string'], [endpoint.name]));

      const authorizerAddresses = endpoint.authorizers.reduce((acc: string[], authorizerName: string) => {
        const address = authorizersByName[authorizerName];
        return [...acc, address];
      }, []);

      await airnode.connect(apiProvider.signer).updateEndpointAuthorizers(providerId, endpointId, authorizerAddresses);
    }
  }
}

function deriveWalletFromPath(mnemonic: string, path: string) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, provider);
}

// async function assignDesignatedWallets() {
//   for (const account of accounts) {
//     const tx = await airnode.connect(account.signer).createRequester(account.address);
//     const logs = await provider.getLogs({ address: airnode.address });
//     const log = logs.find((log) => log.transactionHash === tx.hash);
//     const parsedLog = airnode.interface.parseLog(log!);
//     const requesterIndex = parsedLog.args.requesterInd;
//     const wallet = deriveWalletFromPath(`m/0/0/${requesterIndex}`);
//     const address = wallet.address;
//     designatedWallets.push({ address, requesterIndex, wallet });
//   }
// }
//
// async function fundDesignatedWallets() {
//   for (const [index, designatedWallet] of designatedWallets.entries()) {
//     const requester = config.requesters[index];
//     const value = ethers.utils.parseEther(requester.ethBalance);
//     const to = designatedWallet.address;
//     await master.signer.sendTransaction({ to, value });
//   }
// }
//
// async function endorseRequesterClients() {
//   for (const [index, designatedWallet] of designatedWallets.entries()) {
//     const account = accounts[index];
//     const requester = config.requesters[index];
//     const clientNames = Object.keys(requester.clients);
//
//     for (const clientName of clientNames) {
//       const contract = clients[clientName];
//       // TODO: add types
//       // @ts-ignore
//       const client = requester.clients[clientName];
//       await airnode
//         .connect(account.signer)
//         .updateClientEndorsementStatus(designatedWallet.requesterIndex, contract.address, client.endorsed);
//     }
//   }
// }
//
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
  provider = ethers.provider;
  deployer = provider.getSigner(0);

  await deployContracts();

  await assignAccounts();
  await createProviders();

  // await assignDesignatedWallets();
  // await fundDesignatedWallets();
  //
  // await endorseRequesterClients();
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
