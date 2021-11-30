import { randomUUID } from 'crypto';

import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSecrets = async () => {
  const commonSecrets = await getCommonSecrets();
  writeSecrets([...commonSecrets, `HTTP_GATEWAY_API_KEY=${randomUUID()}`]);
};

export default createSecrets;
