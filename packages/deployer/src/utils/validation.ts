import { Config } from '@api3/node';
import * as logger from '../utils/logger';

export function validateConfig(config: Config, nodeVersion: string) {
  if (nodeVersion !== config.nodeSettings.nodeVersion) {
    logger.fail(
      `nodeVersion under nodeSettings in config.json is ${config.nodeSettings.nodeVersion} while the deployer node version is ${nodeVersion}`
    );
    throw new Error("Node version specified in config.json does not match the deployer's version");
  }

  // TODO: validator integration
}
