import { cliPrint, readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    cliPrint.error('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  runShellCommand(`yarn --cwd ../../ docker:build:node`);
};

runAndHandleErrors(main);
