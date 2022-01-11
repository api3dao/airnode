import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CloudProvider } from '@api3/airnode-node';
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

export async function deploy(configFile: string, secretsFile: string, receiptFile: string) {
  const secrets = parseSecretsFile(secretsFile);
  const config = loadConfig(configFile, secrets, true);

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

  const httpGateway = config.nodeSettings.httpGateway;
  let httpGatewayApiKey: string | undefined = undefined;
  if (httpGateway.enabled) {
    httpGatewayApiKey = httpGateway.apiKey;
    if (!httpGatewayApiKey) {
      throw new Error('Unable to deploy HTTP gateway as the API key is missing');
    }
  }

  logger.debug('Creating a temporary secrets.json file');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const tmpSecretsFile = path.join(tmpDir, 'secrets.json');
  fs.writeFileSync(tmpSecretsFile, JSON.stringify(secrets, null, 2));

  const airnodeAddress = deriveAirnodeAddress(mnemonic);
  // AWS doesn't allow uppercase letters in S3 bucket and lambda function names
  const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);

  let output = {};
  try {
    output = await deployAirnode(
      airnodeAddressShort,
      config.nodeSettings.stage,
      config.nodeSettings.cloudProvider as CloudProvider,
      httpGatewayApiKey,
      configFile,
      tmpSecretsFile
    );
  } catch (err) {
    logger.warn(`Failed deploying configuration, skipping`);
    logger.warn((err as Error).toString());
  }

  logger.debug('Deleting a temporary secrets.json file');
  fs.rmSync(tmpDir, { recursive: true });

  writeReceiptFile(receiptFile, mnemonic, config, output);
}

export async function remove(airnodeAddressShort: string, stage: string, cloudProvider: CloudProvider) {
  await removeAirnode(airnodeAddressShort, stage, cloudProvider);
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
