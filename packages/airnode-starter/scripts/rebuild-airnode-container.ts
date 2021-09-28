import { spawnSync } from 'child_process';
import { readIntegrationInfo } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    console.log('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  spawnSync(`yarn --cwd ../../ docker:node`, {
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
