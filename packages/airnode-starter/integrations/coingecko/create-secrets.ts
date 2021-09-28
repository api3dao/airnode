import { getCommonSecrets, writeSecrets } from '../utils';

async function createSecrets() {
  const secrets = await getCommonSecrets();
  writeSecrets(secrets);
}

export default createSecrets;
