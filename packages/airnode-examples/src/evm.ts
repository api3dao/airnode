import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { ethers } from 'ethers';
import { parse } from 'dotenv';
import { readIntegrationInfo, removeExtension } from './utils';

export enum SameOrCrossChain {
  same,
  cross,
}

/**
 * @returns The ethers provider connected to the provider URL specified in the "integration-info.json".
 */
export const getProvider = (chain = SameOrCrossChain.same) => {
  const integrationInfo = readIntegrationInfo();
  const providerUrl =
    chain === SameOrCrossChain.cross ? integrationInfo.crossChainProviderUrl! : integrationInfo.providerUrl;
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  return provider;
};

/**
 * Reads the mnemonic and provider URL from "integration-info.json" and returns the connected wallet.
 *
 * @returns The connected wallet.
 */
export const getUserWallet = (chain = SameOrCrossChain.same) => {
  const integrationInfo = readIntegrationInfo();
  const provider = getProvider(chain);
  const mnemonic = chain === SameOrCrossChain.cross ? integrationInfo.crossChainMnemonic! : integrationInfo.mnemonic;
  return ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
};

/**
 * Reads the "secrets.env" of the particular integration to obtain the Airnode mnemonic of the Airnode wallet. This
 * wallet is not connected to the provider, since we do not need to make any transactions with it.
 *
 * @returns The Airnode wallet.
 */
export const getAirnodeWallet = () => {
  const integrationInfo = readIntegrationInfo();
  const integrationSecrets = parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/secrets.env`))
  );
  return ethers.Wallet.fromMnemonic(integrationSecrets['AIRNODE_WALLET_MNEMONIC']);
};

/**
 * Reads the compiled solidity artifact necessary for contract deployment.
 *
 * @param artifactsFolderPath
 * @returns The compiled artifact
 */
const getArtifact = (artifactsFolderPath: string) => {
  const fullArtifactsPath = join(__dirname, '../artifacts/', artifactsFolderPath);
  const files = readdirSync(fullArtifactsPath);
  const artifactName = files.find((f) => !f.endsWith('.dbg.json'))!;
  const artifactPath = join(fullArtifactsPath, artifactName);
  return require(artifactPath);
};

/**
 * Writes the address of the contract to the deployments file
 * @param artifactsFolderPath
 * @param address
 */
export const writeAddressToDeploymentsFile = (
  artifactsFolderPath: string,
  address: string,
  chain: SameOrCrossChain
) => {
  // Make sure the deployments folder exist
  const deploymentsPath = join(__dirname, '../deployments');
  if (!existsSync(deploymentsPath)) mkdirSync(deploymentsPath);

  // Try to load the existing deployments file for this network - we want to preserve deployments of other contracts
  const network =
    chain === SameOrCrossChain.cross ? readIntegrationInfo().crossChainNetwork! : readIntegrationInfo().network;
  const deploymentPath = join(deploymentsPath, network + '.json');
  let deployment: any = {};
  if (existsSync(deploymentPath)) deployment = JSON.parse(readFileSync(deploymentPath).toString());

  // The key name for this contract is the path of the artifact without the '.sol' extension
  const deploymentName = removeExtension(artifactsFolderPath);
  // Write down the address of deployed contract
  writeFileSync(deploymentPath, JSON.stringify({ ...deployment, [deploymentName]: address }, null, 2));
};

/**
 * Deploys the contract specified by the path to the artifact and constructor arguments and writes the
 * address of the deployed contract which can be used to connect to the contract.
 *
 * @param artifactsFolderPath
 * @param args Arguments for the contract constructor to be deployed
 * @returns The deployed contract
 */
export const deployContract = async (artifactsFolderPath: string, args: any[] = [], chain = SameOrCrossChain.same) => {
  const artifact = getArtifact(artifactsFolderPath);

  // Deploy the contract
  const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, await getUserWallet(chain));
  const contract = await contractFactory.deploy(...args);
  await contract.deployed();

  writeAddressToDeploymentsFile(artifactsFolderPath, contract.address, chain);

  return contract;
};

/**
 * Connect to the already deployed contract specified by the path to the compiled contract artifact.
 *
 * @param artifactsFolderPath
 * @returns The deployed contract
 */
export const getDeployedContract = async (artifactsFolderPath: string, chain = SameOrCrossChain.same) => {
  const artifact = getArtifact(artifactsFolderPath);

  const network = readIntegrationInfo().network;
  const deploymentPath = join(__dirname, '../deployments', network + '.json');
  const deployment = JSON.parse(readFileSync(deploymentPath).toString());
  const deploymentName = removeExtension(artifactsFolderPath);

  return new ethers.Contract(deployment[deploymentName], artifact.abi, await getUserWallet(chain));
};

/**
 * @returns The chain id of the chosen network
 */
export const readChainId = async (chain = SameOrCrossChain.same) => {
  const network = await getProvider(chain).getNetwork();
  return network.chainId;
};
