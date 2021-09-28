import { spawnSync } from 'child_process';
import { join } from 'path';
import { readIntegrationInfo } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'aws') {
    console.log('You only need to deploy run this script if you deploy on AWS');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  const secretsFilePath = join(__dirname, '../aws.env');
  const deployCommand = [
    `docker run -it --rm`,
    `--env-file ${secretsFilePath}`,
    `-e USER_ID=$(id -u) -e GROUP_ID=$(id -g)`,
    `-v ${integrationPath}:/app/config`,
    `-v ${integrationPath}/output:/app/output`,
    `api3/deployer:latest deploy`,
  ].join(' ');

  spawnSync(deployCommand, {
    shell: true,
    stdio: 'inherit',
  });
  console.log('Airnode deployment successful. See the generated receipt.json for detailed information.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
