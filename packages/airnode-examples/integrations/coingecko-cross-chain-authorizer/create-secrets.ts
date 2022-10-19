import { readIntegrationInfo } from '../../src';
import { getCommonSecrets, writeSecrets } from '../secrets-utils';

const createSecrets = async (generateExampleFile = false) => {
  const secrets = await getCommonSecrets(generateExampleFile);
  const crossChainUrl = generateExampleFile ? `http://127.0.0.1:8545/` : readIntegrationInfo().crossChainProviderUrl!;
  secrets.push(`CROSS_CHAIN_PROVIDER_URL=${crossChainUrl}`);

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
