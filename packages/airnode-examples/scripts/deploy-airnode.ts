import { join } from 'path';
import {
  cliPrint,
  isWindows,
  readIntegrationInfo,
  readPackageVersion,
  runAndHandleErrors,
  runShellCommand,
} from '../src';

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

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  const secretsFilePath = join(__dirname, '../aws.env');
  const deployCommand = [
    `docker run -it --rm`,
    isWindows() ? '' : `-e USER_ID=$(id -u) -e GROUP_ID=$(id -g)`,
    integrationInfo.airnodeType === 'aws' && `--env-file ${secretsFilePath}`,
    integrationInfo.airnodeType === 'gcp' && `-v "${integrationPath}/gcp.json:/app/gcp.json"`,
    `-v ${integrationPath}:/app/config`,
    `-v ${integrationPath}:/app/output`,
    `${imageName} deploy`,
  ]
    .filter(Boolean)
    .join(' ');

  runShellCommand(deployCommand);
};

runAndHandleErrors(main);
