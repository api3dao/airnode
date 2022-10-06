import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile).concat(['EVERYTHING_AUTHORIZER=', 'NOTHING_AUTHORIZER=']);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
