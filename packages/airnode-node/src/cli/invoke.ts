import * as path from 'path';
import dotenv from 'dotenv';
import * as local from '../workers/local-handlers';

dotenv.config({ path: path.resolve(`${__dirname}/../../config/secrets.env`) });

async function invoke() {
  await local.startCoordinator();
}

invoke();
