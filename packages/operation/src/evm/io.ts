import fs from 'fs';
import { buildSaveableDeployment } from './deploy/state';
import { Config, Deployment, DeployState as State } from '../types';

const DEPLOY_DIR = './deployments';
const DEPLOY_FILE = 'evm-dev.json';

export function loadConfig(): Config {
  return JSON.parse(fs.readFileSync('./src/config/evm-dev-config.json', 'utf8'));
}

export function loadDeployment(): Deployment {
  if (!fs.existsSync(`${DEPLOY_DIR}/${DEPLOY_FILE}`)) {
    throw new Error(`Unable to find file: ${DEPLOY_DIR}/${DEPLOY_FILE}`);
  }
  return JSON.parse(fs.readFileSync(`${DEPLOY_DIR}/${DEPLOY_FILE}`, 'utf8'));
}

export function saveDeployment(state: State) {
  if (!fs.existsSync(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR);
  }
  const deployData = buildSaveableDeployment(state);
  const stringified = JSON.stringify(deployData, null, 2);
  fs.writeFileSync(`${DEPLOY_DIR}/${DEPLOY_FILE}`, stringified);
}
