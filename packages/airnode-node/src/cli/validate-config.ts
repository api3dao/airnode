import * as path from 'path';
import dotenv from 'dotenv';
import { loadConfig } from '../config';

dotenv.config({ path: path.resolve(`${__dirname}/../../config/secrets.env`) });
// We don't care about the config itself, we just need it to be validated when the airnode-client starts
loadConfig(path.resolve(`${__dirname}/../../config/config.json`), process.env);
