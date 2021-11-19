import { readFileSync } from 'fs';
import { join } from 'path';
import { getCommonSecrets, writeSecrets } from '../utils';

const integrationInfo = JSON.parse(readFileSync(join(__dirname, '../../integration-info.json')).toString());

const createSecrets = async () => {
  const secrets = await getCommonSecrets();
  secrets.push(`CMC_PRO_API_KEY=${integrationInfo.cmcApiKey}`);
  writeSecrets(secrets);
};

export default createSecrets;
