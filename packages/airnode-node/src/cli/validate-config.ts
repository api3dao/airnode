import * as path from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { loadConfig } from '../config';

const rawSecrets = readFileSync(path.resolve(`${__dirname}/../../config/secrets.env`));
const secrets = dotenv.parse(rawSecrets);
const config = loadConfig(path.resolve(`${__dirname}/../../config/config.json`), secrets);

// Make sure that the "cloudProvider" section is set to use the local cloud provider
if (config.nodeSettings.cloudProvider.type !== 'local') {
  throw new Error('Expected "nodeSettings.cloudProvider.type" to be set to "local"');
}
