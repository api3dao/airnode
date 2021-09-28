import { randomUUID } from 'crypto';

import { getCommonSecrets, writeSecrets } from '../utils';

async function createSecrets() {
  const commonSecrets = await getCommonSecrets();
  writeSecrets([...commonSecrets, `HTTP_GATEWAY_API_KEY=${randomUUID()}`]);
}

export default createSecrets;
