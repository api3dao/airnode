import { readFileSync } from 'fs';
import path from 'path';
import { logger, buildBaseOptions } from '@api3/airnode-utilities';
import dotenv from 'dotenv';
import { startGatewayServer } from './server';
import { loadTrustedConfig } from '../../config';
import { setAirnodePrivateKeyToEnv } from '../local-handlers';

const rawSecrets = readFileSync(path.resolve(`${__dirname}/../../../config/secrets.env`));
const secrets = dotenv.parse(rawSecrets);
// Configuration is checked when at the start of the container
const config = loadTrustedConfig(path.resolve(`${__dirname}/../../../config/config.json`), secrets);
setAirnodePrivateKeyToEnv(config.nodeSettings.airnodeWalletMnemonic);
const logOptions = buildBaseOptions(config, {});

// Determine which gateways are enabled
const gatewayNames = ['httpGateway', 'httpSignedDataGateway'] as const;
const enabledGateways = gatewayNames.filter((gatewayName) => config.nodeSettings[gatewayName].enabled);
const disabledGateways = gatewayNames.filter((gatewayName) => !config.nodeSettings[gatewayName].enabled);
disabledGateways.forEach((gatewayName) => {
  logger.log(`Gateway "${gatewayName}" not enabled.`, logOptions);
});

startGatewayServer(config, logOptions, enabledGateways);
