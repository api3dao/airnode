import { Config } from '@api3/airnode-node';
import { validateJsonWithTemplate } from '@api3/airnode-validator';
import * as logger from '../utils/logger';

export function validateConfig(config: Config, nodeVersion: string, skipValidation: boolean) {
  if (skipValidation) {
    logger.warn('Skipping the config validation');
    return;
  }

  if (config.nodeSettings.cloudProvider.type === 'local') {
    const message = "Deployer can't deploy to 'local' cloud provider";
    logger.fail(message);
    throw new Error(message);
  }

  const result = validateJsonWithTemplate(config, `config@${nodeVersion}`);

  if (!result.valid) {
    logger.fail(JSON.stringify(result.messages, null, 2));
    throw new Error('Validation of config failed');
  }

  if (result.messages.length) {
    logger.warn(`Validation of config finished with warnings:\n${JSON.stringify(result.messages, null, 2)}`);
  }
}

export function validateReceipt(supposedReceipt: any, nodeVersion: string) {
  // TODO: Validate receipt version https://api3dao.atlassian.net/browse/AN-423
  return validateJsonWithTemplate(supposedReceipt, `receipt@${nodeVersion}`);
}
