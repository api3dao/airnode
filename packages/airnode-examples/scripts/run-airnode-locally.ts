import { join } from 'path';
import { cliPrint, readIntegrationInfo, readPackageVersion, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    cliPrint.error('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  // Check if we're executing in Github CI - if we are, run the airnode-client development image.
  // If not and a command line arg was passed, use the command-line provided image name (developer convenience).
  // If neither of the first two, use the version from package.json
  const specificImage = process.argv.slice(2);
  const packageVersion = readPackageVersion();
  const imageName = process.env.CI
    ? `api3/airnode-client-dev:${process.env.GITHUB_SHA}`
    : specificImage.length === 1
    ? specificImage
    : `api3/airnode-client:${packageVersion}`;

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  runShellCommand(`docker run --rm -v ${integrationPath}:/app/config --network="host" --name airnode ${imageName}`);
};

runAndHandleErrors(main);
