import * as fs from 'fs';
import * as dotenv from 'dotenv';
import ora from 'ora';

export function parseConfigFile(configPath, nodeVersion) {
  let configs;
  try {
    configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse secrets file');
    throw e;
  }
  // A more comprehensive validation should be done beforehand
  // https://github.com/api3dao/airnode/issues/136
  for (const config of configs) {
    if (config.nodeSettings.cloudProvider !== 'aws') {
      ora().fail('cloudProvider under nodeSettings in config.json is not aws');
      throw new Error('Attempted to use an unsupported cloud provider');
    }
    if (nodeVersion !== config.nodeSettings.nodeVersion) {
      ora().fail(
        `nodeVersion under nodeSettings in config.json is ${config.nodeSettings.nodeVersion} while the deployer node version is ${nodeVersion}`
      );
      throw new Error('Attempted to deploy node configuration with the wrong node version');
    }
  }
  return configs;
}

export function parseSecretsFile(secretsPath) {
  try {
    return dotenv.parse(fs.readFileSync(secretsPath));
  } catch (e) {
    ora().fail('Failed to parse secrets file');
    throw e;
  }
}

export function parseReceiptFile(receiptFilename) {
  try {
    return JSON.parse(fs.readFileSync(receiptFilename, 'utf8'));
  } catch (e) {
    ora().fail('Failed to parse receipt file');
    throw e;
  }
}
