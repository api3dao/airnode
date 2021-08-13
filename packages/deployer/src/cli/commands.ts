import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { config as nodeConfig } from '@api3/node';
import { checkAirnodeParameters } from '../evm';
import { deployAirnode, removeAirnode } from '../infrastructure';
import {
  deriveAirnodeId,
  deriveMasterWalletAddress,
  deriveXpub,
  generateMnemonic,
  parseReceiptFile,
  parseSecretsFile,
  shortenAirnodeId,
  validateConfig,
  validateMnemonic,
  verifyMnemonic,
} from '../utils';
import * as logger from '../utils/logger';

export async function deploy(
  configFile: string,
  secretsFile: string,
  receiptFile: string,
  interactive: boolean,
  nodeVersion: string
) {
  const secrets = parseSecretsFile(secretsFile);
  const config = nodeConfig.parseConfig(configFile, secrets);
  validateConfig(config, nodeVersion);

  if (!secrets.MASTER_KEY_MNEMONIC) {
    logger.warn('If you already have a mnemonic, add it to your secrets.env file and restart the deployer');
    const mnemonic = generateMnemonic();
    if (interactive) {
      logger.warn('Write down the 12 word-mnemonic below on a piece of paper and keep it in a safe place\n');
      await verifyMnemonic(mnemonic);
    }
    secrets.MASTER_KEY_MNEMONIC = mnemonic;
  } else if (!validateMnemonic(secrets.MASTER_KEY_MNEMONIC)) {
    logger.fail('MASTER_KEY_MNEMONIC in your secrets.env file is not valid');
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

  const airnodeId = deriveAirnodeId(secrets.MASTER_KEY_MNEMONIC);
  const masterWalletAddress = deriveMasterWalletAddress(secrets.MASTER_KEY_MNEMONIC);
  await checkAirnodeParameters(config, airnodeId, masterWalletAddress);

  const airnodeIdShort = shortenAirnodeId(airnodeId);
  let output = {};
  try {
    output = await deployAirnode(
      airnodeIdShort,
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

  const receipt = {
    airnodeId: deriveAirnodeId(secrets.MASTER_KEY_MNEMONIC),
    airnodeIdShort,
    config: { chains: config.chains, nodeSettings: config.nodeSettings },
    masterWalletAddress,
    xpub: deriveXpub(secrets.MASTER_KEY_MNEMONIC),
    ...output,
  };

  logger.debug('Deleting a temporary secrets.json file');
  fs.rmSync(tmpDir, { recursive: true });

  logger.debug('Writing receipt.json file');
  fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2));
  logger.info(`Outputted ${receiptFile}\n` + '  This file does not contain any sensitive information.');
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
