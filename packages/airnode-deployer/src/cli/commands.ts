import { loadConfig } from '@api3/airnode-node';
import { go } from '@api3/promise-utils';
import { bold } from 'chalk';
import { deployAirnode, removeAirnode } from '../infrastructure';
import { writeReceiptFile, parseReceiptFile, parseSecretsFile } from '../utils';
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
      bold(
        `Airnode deployment failed due to unexpected errors.\n` +
          `  It is possible that some resources have been deployed on cloud provider.\n` +
          `  Please use the "remove" command from the deployer CLI to ensure all cloud resources are removed.`
      )
    );

    throw goDeployAirnode.error;
  }

  if (!goDeployAirnode.success) {
    logger.fail(
      bold(
        `Airnode deployment failed due to unexpected errors.\n` +
          `  It is possible that some resources have been deployed on cloud provider.\n` +
          `  Attempting to remove them...\n`
      )
    );

    // Try to remove deployed resources
    const goRemoveAirnode = await go(() => removeWithReceipt(receiptFile));
    if (!goRemoveAirnode.success) {
      logger.fail(
        bold(
          `Airnode removal failed due to unexpected errors.\n` +
            `  It is possible that some resources have been deployed on cloud provider.\n` +
            `  Please check the resources on the cloud provider dashboard and\n` +
            `  use the "remove" command from the deployer CLI to remove them.\n` +
            `  If the automatic removal via CLI fails, remove the resources manually.`
        )
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
  if (output.httpGatewayUrl) logger.info(`HTTP gateway URL: ${output.httpGatewayUrl}`);
  if (output.httpSignedDataGatewayUrl) logger.info(`HTTP signed data gateway URL: ${output.httpSignedDataGatewayUrl}`);
}

export async function removeWithReceipt(receiptFilename: string) {
  const receipt = parseReceiptFile(receiptFilename);
  const { cloudProvider, stage } = receipt.deployment;
  const airnodeAddress = receipt.airnodeWallet.airnodeAddress;

  // If the function throws, the CLI will fail with a non zero status code
  await removeAirnode(airnodeAddress, stage, cloudProvider);
}
