import { randomUUID } from 'crypto';

import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSignedDataGatewayApiKey = (generateExampleFile: boolean) => {
  if (generateExampleFile) return '17819376-9f6c-43c7-b6cf-3ffb114ae864';

  return randomUUID();
};

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile);
  secrets.push(`HTTP_SIGNED_DATA_GATEWAY_API_KEY=${createSignedDataGatewayApiKey(generateExampleFile)}`);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
