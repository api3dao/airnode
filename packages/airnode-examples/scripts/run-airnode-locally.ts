import { join } from 'path';
import { getDockerImage } from '@api3/airnode-utilities/dist/utils/docker-utils';
import { cliPrint, readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    cliPrint.error('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  runShellCommand(
    `docker run --rm -v ${integrationPath}:/app/config --network="host" --name airnode ${getDockerImage('client')}`
  );
};

runAndHandleErrors(main);
