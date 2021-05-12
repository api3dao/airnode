import dotenv from 'dotenv';
import * as local from '../src/workers/local-handlers';

dotenv.config();

async function invoke() {
  await local.startCoordinator();
}

invoke();
