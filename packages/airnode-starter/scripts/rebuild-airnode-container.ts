import { readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    console.log('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  runShellCommand(`yarn --cwd ../../ docker:node`);
}

runAndHandleErrors(main);
