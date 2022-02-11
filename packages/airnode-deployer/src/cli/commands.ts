import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudProvider } from '@api3/airnode-node';
import size from 'lodash/size';
import { deployAirnode, removeAirnode } from '../infrastructure';
import {
  deriveAirnodeAddress,
  writeReceiptFile,
  parseReceiptFile,
  parseSecretsFile,
  shortenAirnodeAddress,
  validateMnemonic,
  loadConfig,
} from '../utils';
import * as logger from '../utils/logger';

export async function deploy(configPath: string, secretsPath: string, receiptFile: string) {
  const secrets = parseSecretsFile(secretsPath);
  const config = loadConfig(configPath, secrets, true);

  if (config.nodeSettings.cloudProvider.type === 'local') {
    // We want to check cloud provider type regardless of "skipValidation" value.
    // Skipping this check would always cause a deployer failure.
    const message = "Deployer can't deploy to 'local' cloud provider";
    logger.fail(message);
    throw new Error(message);
  }

  const mnemonic = config.nodeSettings.airnodeWalletMnemonic;
  if (!validateMnemonic(mnemonic)) {
    logger.fail('AIRNODE_WALLET_MNEMONIC in your secrets.env file is not valid');
    throw new Error('Invalid mnemonic');
  }

  // TODO: This should be check by validator
  const maxConcurrency = config.chains.reduce((concurrency: number, chain) => {
    if (chain.maxConcurrency <= 0) {
      logger.fail(`Concurrency limit must be more than 0 for chain with ID ${chain.id}`);
      throw new Error('Invalid concurrency limit');
    }
    if (chain.maxConcurrency < size(chain.providers)) {
      logger.fail(`Concurrency limit can't be lower than number of providers for chain with ID ${chain.id}`);
      throw new Error('Invalid concurrency limit');
    }

    return concurrency + chain.maxConcurrency;
  }, 0);

  const httpGateway = config.nodeSettings.httpGateway;
  if (httpGateway.enabled) {
    if (httpGateway.maxConcurrency !== undefined && httpGateway.maxConcurrency <= 0) {
      throw new Error('Unable to deploy HTTP gateway: Maximal concurrency must be higher than 0');
    }
  }

  logger.debug('Creating a temporary secrets.json file');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const tmpSecretsPath = path.join(tmpDir, 'secrets.json');
  fs.writeFileSync(tmpSecretsPath, JSON.stringify(secrets, null, 2));

  const airnodeAddress = deriveAirnodeAddress(mnemonic);
  // AWS doesn't allow uppercase letters in S3 bucket and lambda function names
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);

  let output = {};
  try {
    output = await deployAirnode({
      airnodeAddressShort,
      stage: config.nodeSettings.stage,
      cloudProvider: { maxConcurrency, ...config.nodeSettings.cloudProvider },
      httpGateway,
      configPath,
      secretsPath: tmpSecretsPath,
    });
  } catch (err) {
    logger.warn(`Failed deploying configuration, skipping`);
    logger.warn((err as Error).toString());
  }

  logger.debug('Deleting a temporary secrets.json file');
  fs.rmSync(tmpDir, { recursive: true });

  writeReceiptFile(receiptFile, mnemonic, config, output);
}

export async function remove(airnodeAddressShort: string, stage: string, cloudProvider: CloudProvider) {
  await removeAirnode({ airnodeAddressShort, stage, cloudProvider });
}

export async function removeWithReceipt(receiptFilename: string) {
  const receipt = parseReceiptFile(receiptFilename);
  const { airnodeAddressShort, cloudProvider, stage } = receipt.deployment;
  try {
    await remove(airnodeAddressShort, stage, cloudProvider);
  } catch (err) {
    logger.warn(`Failed removing configuration, skipping`);
    logger.warn((err as Error).toString());
  }
}
