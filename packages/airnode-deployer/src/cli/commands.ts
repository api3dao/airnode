import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudProvider, loadConfig } from '@api3/airnode-node';
import size from 'lodash/size';
import { bold } from 'chalk';
import { deployAirnode, DeployAirnodeOutput, removeAirnode } from '../infrastructure';
import {
  deriveAirnodeAddress,
  writeReceiptFile,
  parseReceiptFile,
  parseSecretsFile,
  shortenAirnodeAddress,
  validateMnemonic,
} from '../utils';
import * as logger from '../utils/logger';
import { logAndReturnError } from '../utils/infrastructure';

export async function deploy(configPath: string, secretsPath: string, receiptFile: string) {
  const secrets = parseSecretsFile(secretsPath);
  const config = loadConfig(configPath, secrets);

  if (config.nodeSettings.cloudProvider.type === 'local') {
    throw logAndReturnError(`Deployer can't deploy to "local" cloud provider`);
  }

  // TODO: Check this in validator
  const mnemonic = config.nodeSettings.airnodeWalletMnemonic;
  if (!validateMnemonic(mnemonic)) {
    throw logAndReturnError('AIRNODE_WALLET_MNEMONIC in your secrets.env file is not valid');
  }

  // TODO: This should be check by validator
  const maxConcurrency = config.chains.reduce((concurrency: number, chain) => {
    if (chain.maxConcurrency <= 0) {
      throw logAndReturnError(`Concurrency limit must be more than 0 for chain with ID ${chain.id}`);
    }
    if (chain.maxConcurrency < size(chain.providers)) {
      throw logAndReturnError(
        `Concurrency limit can't be lower than number of providers for chain with ID ${chain.id}`
      );
    }

    return concurrency + chain.maxConcurrency;
  }, 0);

  const httpGateway = config.nodeSettings.httpGateway;
  if (httpGateway.enabled) {
    if (httpGateway.maxConcurrency !== undefined && httpGateway.maxConcurrency <= 0) {
      throw logAndReturnError('Unable to deploy HTTP gateway: Maximal concurrency must be higher than 0');
    }
  }

  const httpSignedDataGateway = config.nodeSettings.httpSignedDataGateway;
  if (httpSignedDataGateway.enabled) {
    if (httpSignedDataGateway.maxConcurrency !== undefined && httpSignedDataGateway.maxConcurrency <= 0) {
      throw logAndReturnError('Unable to deploy HTTP gateway: Maximal concurrency must be higher than 0');
    }
  }

  logger.debug('Creating a temporary secrets.json file');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const tmpSecretsPath = path.join(tmpDir, 'secrets.json');
  fs.writeFileSync(tmpSecretsPath, JSON.stringify(secrets, null, 2));

  const airnodeAddress = deriveAirnodeAddress(mnemonic);
  // AWS doesn't allow uppercase letters in S3 bucket and lambda function names
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);

  // Deployment is not an atomic operation. It is possible that some resources are deployed even when there is a
  // deployment error. We want to write a receipt file, because the user might use the receipt to remove the deployed
  // resources from the failed deployment. (The removal is not guaranteed, but it's better compared to asking user to
  // remove the resources manually in the cloud provider dashboard).
  let deploymentError: Error | undefined;
  let output: DeployAirnodeOutput = {};
  try {
    output = await deployAirnode({
      airnodeAddressShort,
      stage: config.nodeSettings.stage,
      cloudProvider: { maxConcurrency, ...config.nodeSettings.cloudProvider },
      httpGateway,
      httpSignedDataGateway,
      configPath,
      secretsPath: tmpSecretsPath,
    });
  } catch (err) {
    deploymentError = err as Error;
  }

  const deploymentTimestamp = new Date().toISOString();

  logger.debug('Deleting a temporary secrets.json file');
  fs.rmSync(tmpDir, { recursive: true });

  writeReceiptFile(receiptFile, mnemonic, config, deploymentTimestamp);

  if (output.httpGatewayUrl) logger.info(`HTTP gateway URL: ${output.httpGatewayUrl}`);
  if (output.httpSignedDataGatewayUrl) logger.info(`HTTP signed data gateway URL: ${output.httpSignedDataGatewayUrl}`);

  if (deploymentError) {
    logger.fail(
      bold(
        `Airnode deployment failed due to unexpected errors.\n` +
          `  It is possible that some resources have been deployed on cloud provider.\n` +
          `  Please use the "remove" command from the deployer CLI to ensure all cloud resources are removed.`
      )
    );
    throw deploymentError;
  }
}

export async function remove(airnodeAddressShort: string, stage: string, cloudProvider: CloudProvider) {
  await removeAirnode({ airnodeAddressShort, stage, cloudProvider });
}

export async function removeWithReceipt(receiptFilename: string) {
  const receipt = parseReceiptFile(receiptFilename);
  const { airnodeAddressShort, cloudProvider, stage } = receipt.deployment;

  // If the function throws, the CLI will fail with a non zero status code
  await remove(airnodeAddressShort, stage, cloudProvider);
}
