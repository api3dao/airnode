import { spawnSync } from 'child_process';
import { join } from 'path';
import { readIntegrationInfo } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo?.airnodeType !== 'aws') {
    console.log('You only need to deploy run this script if you deploy on AWS');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  spawnSync(
    `yarn deployer deploy --config ${integrationPath}/config.json --secrets ${integrationPath}/secrets.env --receipt ${integrationPath}/receipt.json`,
    {
      shell: true,
      stdio: 'inherit',
    }
  );

  console.log('Airnode deployment successful. See the generated receipt.json for detailed information.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
