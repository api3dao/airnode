import dotenv from 'dotenv';
import * as localHandlers from '../src/core/workers/local-handlers';

dotenv.config();

async function invoke() {
  await localHandlers.startCoordinator();
}

invoke();
