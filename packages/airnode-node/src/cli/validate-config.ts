import * as path from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { loadConfig } from '../config';

const rawSecrets = readFileSync(path.resolve(`${__dirname}/../../config/secrets.env`));
const secrets = dotenv.parse(rawSecrets);
// We don't care about the config itself, we just need it to be validated when the airnode-client starts
loadConfig(path.resolve(`${__dirname}/../../config/config.json`), secrets);
