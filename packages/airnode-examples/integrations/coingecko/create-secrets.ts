import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSecrets = async () => {
  const secrets = await getCommonSecrets();
  writeSecrets(secrets);
};

export default createSecrets;
