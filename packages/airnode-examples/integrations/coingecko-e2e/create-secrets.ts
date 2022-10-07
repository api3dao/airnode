import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile).concat([
    'EVERYTHING_AUTHORIZER=0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3',
    'NOTHING_AUTHORIZER=0x7969c5eD335650692Bc04293B07F5BF2e7A673C0',
  ]);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
