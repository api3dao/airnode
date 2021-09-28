import { getCommonSecrets, writeSecrets } from '../utils';

const createSecrets = async () => {
  const secrets = await getCommonSecrets();
  writeSecrets(secrets);
};

export default createSecrets;
