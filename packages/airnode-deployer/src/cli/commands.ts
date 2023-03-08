import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, deriveDeploymentVersionId } from '@api3/airnode-node';
import { go } from '@api3/promise-utils';
import { deployAirnode, removeAirnode, saveDeploymentFiles } from '../infrastructure';
import { writeReceiptFile, parseReceiptFile, parseSecretsFile, deriveAirnodeAddress } from '../utils';
import * as logger from '../utils/logger';
import { logAndReturnError, MultiMessageError } from '../utils/infrastructure';

export async function deploy(configPath: string, secretsPath: string, receiptFile: string, autoRemove: boolean) {
  const secrets = parseSecretsFile(secretsPath);
  const config = loadConfig(configPath, secrets);

  if (config.nodeSettings.cloudProvider.type === 'local') {
    throw logAndReturnError(`Deployer can't deploy to "local" cloud provider`);
  }

  // Deployment is not an atomic operation. It is possible that some resources are deployed even when there is a
  // deployment error. We want to write a receipt file, because the user might use the receipt to remove the deployed
  // resources from the failed deployment. (The removal is not guaranteed, but it's better compared to asking user to
  // remove the resources manually in the cloud provider dashboard).

  const time = new Date();
  const goDeployAirnode = await go(() => deployAirnode(config, configPath, secretsPath, time.getTime()));
  writeReceiptFile(receiptFile, config, time.toISOString(), goDeployAirnode.success);

  if (!goDeployAirnode.success && !autoRemove) {
    logger.fail(
      `Airnode deployment failed due to unexpected errors.\n` +
        `  It is possible that some resources have been deployed on cloud provider.\n` +
        `  Please use the "remove" command from the deployer CLI to ensure all cloud resources are removed.`,
      { bold: true }
    );

    throw goDeployAirnode.error;
  }

  if (!goDeployAirnode.success) {
    logger.fail(
      `Airnode deployment failed due to unexpected errors.\n` +
        `  It is possible that some resources have been deployed on cloud provider.\n` +
        `  Attempting to remove them...\n`,
      { bold: true }
    );

    // Try to remove deployed resources
    const goRemoveAirnode = await go(() => removeWithReceipt(receiptFile));
    if (!goRemoveAirnode.success) {
      logger.fail(
        `Airnode removal failed due to unexpected errors.\n` +
          `  It is possible that some resources have been deployed on cloud provider.\n` +
          `  Please check the resources on the cloud provider dashboard and\n` +
          `  use the "remove" command from the deployer CLI to remove them.\n` +
          `  If the automatic removal via CLI fails, remove the resources manually.`,
        { bold: true }
      );

      throw new MultiMessageError([
        'Deployment error:\n' + goDeployAirnode.error.message,
        'Removal error:\n' + goRemoveAirnode.error.message,
      ]);
    }

    logger.succeed('Successfully removed the Airnode deployment');
    throw new Error('Deployment error:\n' + goDeployAirnode.error.message);
  }

  const output = goDeployAirnode.data;
  if (output.httpGatewayUrl) {
    logger.setSecret(output.httpGatewayUrl);
    logger.info(`HTTP gateway URL: ${output.httpGatewayUrl}`, { secrets: true });
  }
  if (output.httpSignedDataGatewayUrl) {
    logger.setSecret(output.httpSignedDataGatewayUrl);
    logger.info(`HTTP signed data gateway URL: ${output.httpSignedDataGatewayUrl}`, { secrets: true });
  }
  if (output.oevGatewayUrl) {
    logger.setSecret(output.oevGatewayUrl);
    logger.info(`OEV gateway URL: ${output.oevGatewayUrl}`, { secrets: true });
  }

  return { creationTime: time };
}

export async function removeWithReceipt(receiptFilename: string) {
  const receipt = parseReceiptFile(receiptFilename);
  const { deploymentId } = receipt.deployment;

  // If the function throws, the CLI will fail with a non zero status code
  await removeAirnode(deploymentId);
}

export async function rollback(deploymentId: string, versionId: string, receiptFile: string, autoRemove: boolean) {
  const spinner = logger.getSpinner();
  spinner.start(`Rollback of deployment '${deploymentId}' to version '${versionId}'`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const configDirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const configPathTmp = path.join(configDirTmp, 'config.json');
  const secretsPathTmp = path.join(configDirTmp, 'secrets.env');

  try {
    await saveDeploymentFiles(deploymentId, versionId, configPathTmp, secretsPathTmp);
    const { creationTime } = await deploy(configPathTmp, secretsPathTmp, receiptFile, autoRemove);

    const secrets = parseSecretsFile(secretsPathTmp);
    const config = loadConfig(configPathTmp, secrets);
    const { airnodeWalletMnemonic, cloudProvider, stage, nodeVersion } = config.nodeSettings;
    const airnodeAddress = deriveAirnodeAddress(airnodeWalletMnemonic);
    const newVersionId = deriveDeploymentVersionId(
      cloudProvider,
      airnodeAddress,
      stage,
      nodeVersion,
      `${creationTime.getTime()}`
    );

    spinner.succeed(
      `Rollback of deployment '${deploymentId}' successful, new version '${newVersionId}' with configuration from version '${versionId}' created`
    );
  } finally {
    fs.rmSync(configDirTmp, { recursive: true });
  }
}
