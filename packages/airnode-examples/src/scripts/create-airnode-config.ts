import { readIntegrationInfo, runAndHandleErrors, getDeployedContract, cliPrint } from '../';

const main = async () => {
  const integrationInfo = readIntegrationInfo();

  // If using the localhost network, check that AirnodeRrp was deployed
  if (integrationInfo.network === 'localhost') {
    try {
      await getDeployedContract('@api3/airnode-protocol/contracts/rrp/AirnodeRrpV0.sol');
    } catch (e) {
      if (e instanceof Error && (e.message.includes('ENOENT') || e.message.includes('invalid contract address'))) {
        cliPrint.error(
          'AirnodeRrpV0 contract deployment not found. Please follow the RRP deployment ' +
            'instructions in the README before running this command.'
        );
        process.exit(1);
      }
      throw e;
    }
  }

  // Import the "create-config" file from the chosen integration. See the respective "create-config.ts" file for
  // details.
  const createConfig = await import(`../../integrations/${integrationInfo.integration}/create-config.ts`);
  await createConfig.default();
};

runAndHandleErrors(main);
