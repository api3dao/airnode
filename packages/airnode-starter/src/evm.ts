import { join } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { ethers } from 'ethers';
import { parse } from 'dotenv';
import { readIntegrationInfo, removeExtension } from './utils';

export const getProvider = () => {
  const integrationInfo = readIntegrationInfo();
  const provider = new ethers.providers.JsonRpcProvider(integrationInfo.providerUrl);
  return provider;
};

export const getUserWallet = () => {
  const integrationInfo = readIntegrationInfo();
  const provider = getProvider();
  return ethers.Wallet.fromMnemonic(integrationInfo.mnemonic).connect(provider);
};

export const getAirnodeWallet = () => {
  const integrationInfo = readIntegrationInfo();
  const integrationSecrets = parse(
    readFileSync(join(__dirname, `../integrations/${integrationInfo.integration}/secrets.env`))
  );
  return ethers.Wallet.fromMnemonic(integrationSecrets['AIRNODE_WALLET_MNEMONIC']);
};

export const getAirnodeXpub = (airnodeWallet: ethers.Wallet) => {
  const hdNode = ethers.utils.HDNode.fromMnemonic(airnodeWallet.mnemonic.phrase);
  return hdNode.neuter().extendedKey;
};

const getArtifact = (artifactsFolderPath: string) => {
  const fullArtifactsPath = join(__dirname, '../artifacts/', artifactsFolderPath);
  const files = readdirSync(fullArtifactsPath);
  const artifactName = files.find((f) => !f.endsWith('.dbg.json'))!;
  const artifactPath = join(fullArtifactsPath, artifactName);
  return require(artifactPath);
};

export const deployContract = async (artifactsFolderPath: string, args: any[] = []) => {
  const artifact = getArtifact(artifactsFolderPath);

  // Deploy the contract
  const contractFactory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, await getUserWallet());
  const contract = await contractFactory.deploy(...args);
  await contract.deployed();

  // Write down the address of deployed contract
  const deploymentsPath = join(__dirname, '../deployments');
  if (!existsSync(deploymentsPath)) mkdirSync(deploymentsPath);

  const network = readIntegrationInfo().network;
  const deploymentPath = join(deploymentsPath, network + '.json');
  let deployment: any = {};
  if (existsSync(deploymentPath)) deployment = JSON.parse(readFileSync(deploymentPath).toString());

  const deploymentName = removeExtension(artifactsFolderPath);
  writeFileSync(deploymentPath, JSON.stringify({ ...deployment, [deploymentName]: contract.address }, null, 2));

  return contract;
};

export const getDeployedContract = async (artifactsFolderPath: string) => {
  const artifact = getArtifact(artifactsFolderPath);

  const network = readIntegrationInfo().network;
  const deploymentPath = join(__dirname, '../deployments', network + '.json');
  const deployment = JSON.parse(readFileSync(deploymentPath).toString());
  const deploymentName = removeExtension(artifactsFolderPath);

  return new ethers.Contract(deployment[deploymentName], artifact.abi, await getUserWallet());
};

export const readChainId = async () => {
  const network = await getProvider().getNetwork();
  return network.chainId;
};
