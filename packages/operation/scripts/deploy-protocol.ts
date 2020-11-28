import '@nomiclabs/hardhat-ethers';
import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';
import { ethers } from 'hardhat';
import { Contract, providers, Wallet } from 'ethers';
import { encodeMap } from 'cbor-custom';
import config from '../deploy-config.json';

interface Account {
  address: string;
  signer: providers.JsonRpcSigner;
}

interface DesignatedWallet {
  address: string;
  requesterIndex: string;
  wallet: Wallet;
}

const MNEMONIC = config.mnemonic;

let airnode: Contract;
let convenience: Contract;
const clients: { [name: string]: Contract } = {};

let provider: providers.JsonRpcProvider;
let xpub: string;

let master: Account;
let providerAdmin: Account;
const accounts: Account[] = [];
// Each account will have a designated wallet at the same array index
const designatedWallets: DesignatedWallet[] = [];

const templateAddressesById: { [id: string]: string } = {};

async function deployContracts() {
  const Airnode = await ethers.getContractFactory('Airnode', master);
  airnode = await Airnode.deploy();
  await airnode.deployed();

  const Convenience = await ethers.getContractFactory('Convenience', master);
  convenience = await Convenience.deploy(airnode.address);
  await convenience.deployed();

  const clientNames = flatMap(config.requesters, (r) => Object.keys(r.clients));
  for (const clientName of uniq(clientNames)) {
    const MockClient = await ethers.getContractFactory(clientName, master);
    const mockClient = await MockClient.deploy(airnode.address);
    await mockClient.deployed();
    clients[clientName] = mockClient;
  }
}

function deriveExtendedPublicKey() {
  const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);
  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
}

async function assignAccounts() {
  const masterSigner = provider.getSigner(0);
  const masterAddress = await masterSigner.getAddress();
  const providerAdminSigner = provider.getSigner(1);
  const providerAdminAddress = await providerAdminSigner.getAddress();

  master = { signer: masterSigner, address: masterAddress };
  providerAdmin = { signer: providerAdminSigner, address: providerAdminAddress };

  const requesterCount = config.requesters.length;
  const requesterIndices = [...new Array(requesterCount).keys()];
  for (const index of requesterIndices) {
    const signer = provider.getSigner(index + 2);
    const address = await signer.getAddress();
    accounts.push({ signer, address });
  }
}

async function createAndAuthorizeEndpoints(providerId: string) {
  const { signer } = providerAdmin;

  for (const endpoint of config.endpoints) {
    const { keccak256, defaultAbiCoder } = ethers.utils;
    const endpointId = keccak256(defaultAbiCoder.encode(['string'], [endpoint.name]));
    console.log(`Endpoint:${endpoint.name} has ID:${endpointId}`);

    await airnode.connect(signer).updateEndpointAuthorizers(providerId, endpointId, endpoint.authorizedAddresses);
  }
}

function deriveWalletFromPath(path: string) {
  const masterHdNode = ethers.utils.HDNode.fromMnemonic(MNEMONIC);
  const designatorHdNode = masterHdNode.derivePath(path);
  return new ethers.Wallet(designatorHdNode.privateKey, provider);
}

async function assignDesignatedWallets() {
  for (const account of accounts) {
    const tx = await airnode.connect(account.signer).createRequester(account.address);
    const logs = await provider.getLogs({ address: airnode.address });
    const log = logs.find((log) => log.transactionHash === tx.hash);
    const parsedLog = airnode.interface.parseLog(log!);
    const requesterIndex = parsedLog.args.requesterInd;
    const wallet = deriveWalletFromPath(`m/0/0/${requesterIndex}`);
    const address = wallet.address;
    designatedWallets.push({ address, requesterIndex, wallet });
  }
}

async function fundDesignatedWallets() {
  for (const [index, designatedWallet] of designatedWallets.entries()) {
    const requester = config.requesters[index];
    const value = ethers.utils.parseEther(requester.ethBalance);
    const to = designatedWallet.address;
    await master.signer.sendTransaction({ to, value });
  }
}

async function endorseRequesterClients() {
  for (const [index, designatedWallet] of designatedWallets.entries()) {
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

async function createTemplates() {
  const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [providerAdmin.address]));

  for (const [index, designatedWallet] of designatedWallets.entries()) {
    const requester = config.requesters[index];

    for (const clientName of Object.keys(requester.clients)) {
      // TODO: add types
      // @ts-ignore
      const client = requester.clients[clientName];
      const clientContract = clients[clientName];

      for (const template of client.templates) {
        const { keccak256, defaultAbiCoder } = ethers.utils;
        const endpointId = keccak256(defaultAbiCoder.encode(['string'], [template.endpointName]));
        const tx = await airnode.createTemplate(
          providerId,
          endpointId,
          designatedWallet.requesterIndex,
          designatedWallet.address,
          clientContract.address,
          clientContract.interface.getSighash('fulfill(bytes32,uint256,bytes32)'),
          encodeMap(template.parameters)
        );
        const logs = await provider.getLogs({ address: airnode.address });
        const log = logs.find((log) => log.transactionHash === tx.hash);
        const parsedLog = airnode.interface.parseLog(log!);
        const onchainTemplateId = parsedLog.args.templateId;
        templateAddressesById[template.id] = onchainTemplateId;
      }
    }
  }
}

async function makeShortRequests() {
  for (const requester of config.requesters) {
    for (const clientName of Object.keys(requester.clients)) {
      // TODO: add types
      // @ts-ignore
      const client = requester.clients[clientName];
      const clientContract = clients[clientName];

      for (const request of client.shortRequests) {
        const templateAddress = templateAddressesById[request.templateId];
        // TODO: add types
        // @ts-ignore
        const template = client.templates.find((t) => t.id === request.templateId);
        const encodedParameters = encodeMap(template.parameters);
        await clientContract.makeShortRequest(templateAddress, encodedParameters);
      }
    }
  }
}

async function main() {
  await deployContracts();

  provider = ethers.provider;
  xpub = deriveExtendedPublicKey();

  await assignAccounts();
  await airnode.connect(providerAdmin.signer).createProvider(providerAdmin.address, xpub);

  const providerId = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [providerAdmin.address]));
  await createAndAuthorizeEndpoints(providerId);

  await assignDesignatedWallets();
  await fundDesignatedWallets();

  await endorseRequesterClients();
  await createTemplates();

  await makeShortRequests();

  console.log('Protocol deployed to:', airnode.address);
  console.log('Convenience deployed to:', convenience.address);
  console.log('Extended Public Key:', xpub);
  console.log('Provider ID:', providerId);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
