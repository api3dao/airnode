import { spawnSync } from 'child_process';
import { join } from 'path';
import { readIntegrationInfo } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    console.log('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  spawnSync(`docker run -d -v ${integrationPath}:/app/config --network="host" --name airnode api3/airnode:latest`, {
    shell: true,
    stdio: 'inherit',
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
