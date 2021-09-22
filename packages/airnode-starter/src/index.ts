import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const INTEGRATION_INFO_PATH = join(__dirname, '../integration-info.json');

export const readIntegrationInfo = () => {
  if (!existsSync(INTEGRATION_INFO_PATH)) return null;

  return JSON.parse(readFileSync(INTEGRATION_INFO_PATH).toString());
};
