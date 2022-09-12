import { readIntegrationInfo } from '../../src';
import { writeSecrets } from '../secrets-utils';

const createSecrets = (generateExampleFile = false) => {
  const secrets = [
    // NOTE: We use a hardcoded mnemonic for convenience.
    // For production use, make sure to generate the mnemonic from a reliable source.
    `AIRNODE_WALLET_MNEMONIC=answer tobacco wave sausage age report congress cannon fever hammer happy budget`,
    `PROVIDER_URL=${generateExampleFile ? 'http://127.0.0.1:8545/' : readIntegrationInfo().providerUrl}`,
  ];

  writeSecrets(__dirname, secrets, generateExampleFile);
};

export default createSecrets;
