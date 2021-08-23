import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { config as nodeConfig } from '@api3/node';
import { checkAirnodeParameters } from '../evm';
import { deployAirnode, removeAirnode } from '../infrastructure';
import {
  deriveAirnodeId,
  deriveMasterWalletAddress,
  writeReceiptFile,
  generateMnemonic,
  parseReceiptFile,
  parseSecretsFile,
  shortenAirnodeId,
  validateConfig,
  validateMnemonic,
  verifyMnemonic,
} from '../utils';
import * as logger from '../utils/logger';
import { Config } from '../types';

export async function deploy(
  configFile: string,
  secretsFile: string,
  receiptFile: string,
  interactive: boolean,
  nodeVersion: string
) {
  const secrets = parseSecretsFile(secretsFile);
  const config: Config = nodeConfig.parseConfig(configFile, secrets);
  validateConfig(config, nodeVersion);

  let mnemonic = config.nodeSettings.airnodeWalletMnemonic;
  if (!mnemonic) {
    logger.warn('If you already have a mnemonic, add it to your secrets.env file and restart the deployer');
    mnemonic = generateMnemonic();
    if (interactive) {
      logger.warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
      await verifyMnemonic(mnemonic);
    }
  } else if (!validateMnemonic(mnemonic)) {
    logger.fail('AIRNODE_WALLET_MNEMONIC in your secrets.env file is not valid');
    throw new Error('Invalid mnemonic');
  }

  let testingApiKey: string | undefined = undefined;
  if (config.nodeSettings.enableTestingGateway) {
    testingApiKey = secrets.ENDPOINT_TESTING_API_KEY;
    if (!testingApiKey) {
      throw new Error('Unable to deploy testing gateway as the ENDPOINT_TESTING_API_KEY secret is missing');
    }
  }

  logger.debug('Creating a temporary secrets.json file');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const tmpSecretsFile = path.join(tmpDir, 'secrets.json');
  fs.writeFileSync(tmpSecretsFile, JSON.stringify(secrets, null, 2));

  const airnodeId = deriveAirnodeId(mnemonic);
  const masterWalletAddress = deriveMasterWalletAddress(mnemonic);
  await checkAirnodeParameters(config, airnodeId, masterWalletAddress);

  let output = {};
  try {
    output = await deployAirnode(
      shortenAirnodeId(airnodeId),
      config.nodeSettings.stage,
      config.nodeSettings.cloudProvider,
      config.nodeSettings.region,
      testingApiKey,
      configFile,
      tmpSecretsFile
    );
  } catch (err) {
    logger.warn(`Failed deploying configuration, skipping`);
    logger.warn(err.toString());
  }

  logger.debug('Deleting a temporary secrets.json file');
  fs.rmSync(tmpDir, { recursive: true });

  writeReceiptFile(receiptFile, mnemonic, config, output);
}

export async function remove(airnodeIdShort: string, stage: string, cloudProvider: string, region: string) {
  await removeAirnode(airnodeIdShort, stage, cloudProvider, region);
}

export async function removeWithReceipt(receiptFilename: string) {
  const receipt = parseReceiptFile(receiptFilename);
  try {
    await remove(
      receipt.airnodeIdShort,
      receipt.config.nodeSettings.stage,
      receipt.config.nodeSettings.cloudProvider,
      receipt.config.nodeSettings.region
    );
  } catch (err) {
    logger.warn(`Failed removing configuration, skipping`);
    logger.warn(err.toString());
  }
}
