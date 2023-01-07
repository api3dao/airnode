import { join } from 'path';
import { cliPrint, isWindows, readIntegrationInfo, readPackageVersion, runAndHandleErrors, runShellCommand } from '../';

// eslint-disable-next-line require-await
const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType === 'local') {
    cliPrint.error('You only need to run this script if you deploy on a cloud provider');
    return;
  }

  // Use a command-line provided image name if a command line arg was passed (developer convenience).
  // Otherwise, use the version from package.json.
  const specificImage = process.argv.slice(2);
  const packageVersion = readPackageVersion();
  const imageName = specificImage.length === 1 ? specificImage : `api3/airnode-deployer:${packageVersion}`;

  const integrationPath = join(__dirname, '../../integrations', integrationInfo.integration);
  const deployCommand = [
    `docker run -it --rm`,
    isWindows() ? '' : `-e USER_ID=$(id -u) -e GROUP_ID=$(id -g)`,
    `-v ${integrationPath}:/app/config`,
    `${imageName} deploy --debug`,
  ]
    .filter(Boolean)
    .join(' ');

  runShellCommand(deployCommand);
};

runAndHandleErrors(main);
