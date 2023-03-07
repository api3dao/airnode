import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
