/**
 * This script facilitates testing of Airnode releases and snapshot releases.
 * It covers the following:
 * - Testing npm packages that have a help command to catch broken packaging
 * - Validating config.json and secrets.env using the npm validator package
 * - Testing the generate-mnemonic command of the npm admin package
 * - Pulling the docker images
 * - Deploying Airnode to a cloud provider
 * - Making a blockchain request
 * - Making a HTTP gateway request
 * - Making a HTTP signed data gateway request
 * - Listing deployed Airnodes
 * - Removing the Airnode deployment
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import axios from 'axios';
import prompts from 'prompts';

/* eslint-disable no-console */

// spawnSync with 'pipe' is sufficient for npx and many yarn commands, but others like deploy-airnode
// will error with 'the input device is not a TTY' and therefore need inherit
type spawnSyncStdIo = 'pipe' | 'inherit';

const executeCommandSync = (command: string, spawnSyncStdIo: spawnSyncStdIo = 'pipe', outputFile = '') => {
  console.info(`Running command: ${command}`);
  const redirect = outputFile ? `> ${outputFile} 2>&1` : '';
  const result = spawnSync(command + redirect, {
    stdio: spawnSyncStdIo,
    shell: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed with non-zero status code: ${result.status}`,
        `Stderr: ${result.stderr?.toString().trim()}`,
        `Stdout: ${result.stdout?.toString().trim()}`,
      ].join('\n')
    );
  }
};

const promptKeyPress = async (message: string) => {
  console.log(message);
  await prompts({
    type: 'confirm',
    name: 'continue',
    message: 'Press enter to continue...',
    initial: true,
  });
};

export const extractGatewayUrls = (consoleOutput: string) => {
  const httpRegex = /HTTP gateway URL: (https:\/\/[^\s]+)/;
  const httpMatches = consoleOutput.match(httpRegex);
  if (!httpMatches) {
    throw new Error('Could not extract the HTTP gateway URL from console output');
  }
  const signedRegex = /HTTP signed data gateway URL: (https:\/\/[^\s]+)/;
  const signedMatches = consoleOutput.match(signedRegex);
  if (!signedMatches) {
    throw new Error('Could not extract the HTTP signed data gateway URL from console output');
  }
  return {
    httpGatewayUrl: httpMatches[1],
    signedHttpGatewayUrl: signedMatches[1],
  };
};

const main = async () => {
  const response = await prompts([
    {
      type: 'text',
      name: 'releaseVersion',
      message: 'Enter the release version e.g., "0.13.0" or "snapshot-v0.13.0"',
    },
    {
      type: 'text',
      name: 'airnodePath',
      message: 'Enter the full path to the Airnode root directory:',
      initial: process.cwd(),
    },
  ]);

  const { releaseVersion, airnodePath } = response;
  // snapshot docker images have a '-dev' suffix, release images do not
  const dockerImgSuffix = releaseVersion.includes('snapshot') ? '-dev' : '';
  const airnodeExamplesPath = `${airnodePath}/packages/airnode-examples`;
  const npmPackages = ['admin', 'deployer', 'validator'];
  const dockerImgs = ['deployer', 'admin', 'client'];

  // Test npm packages that have a help command to catch broken packaging
  for (const pkg of npmPackages) {
    const NAME = `@api3/airnode-${pkg}@${releaseVersion}`;
    executeCommandSync(`npx -y ${NAME} --help`);
  }

  executeCommandSync(
    `npx -y @api3/airnode-validator@${releaseVersion} --config "${airnodePath}/packages/airnode-validator/test/fixtures/config.valid.json" --secrets "${airnodePath}/packages/airnode-validator/test/fixtures/secrets.valid.env"`
  );

  executeCommandSync(`npx -y @api3/airnode-admin@${releaseVersion} generate-mnemonic`);

  for (const image of dockerImgs) {
    executeCommandSync(`docker pull api3/airnode-${image}${dockerImgSuffix}:${releaseVersion}`);
  }

  process.chdir(airnodeExamplesPath);

  const confirmIntegration = await prompts({
    type: 'confirm',
    name: 'bool',
    message:
      "Do you want to rerun 'yarn choose-integration'? (make sure 'coingecko-http-gateways' is set as the integration)",
    initial: true,
  });

  if (confirmIntegration.bool) {
    executeCommandSync('yarn choose-integration', 'inherit');
  }

  const integrationInfo = JSON.parse(readFileSync(`${airnodeExamplesPath}/integration-info.json`).toString());
  const cloudProvider = integrationInfo.airnodeType;
  const integration = integrationInfo.integration;

  if (cloudProvider === 'aws' && !existsSync(`${airnodeExamplesPath}/integrations/${integration}/aws.env`)) {
    executeCommandSync('yarn create-aws-secrets');
  }
  if (cloudProvider === 'gcp' && !existsSync(`${airnodeExamplesPath}/integrations/${integration}/gcp.json`)) {
    console.error(`Missing ${airnodeExamplesPath}/integrations/${integration}/gcp.json`);
    console.error('See the airnode-examples README for instructions on how to generate it.');
    process.exit(1);
  }

  const deployAirnode = await prompts({
    type: 'confirm',
    name: 'bool',
    message: 'Do you want to deploy Airnode? (no = skip deployment, but continue script)',
    initial: true,
  });
  // Redirect output to a file, which is then read to extract the gateway URLs. This is necessary
  // because 'inherit' doesn't allow for stdout to be captured, unlike 'pipe'
  const deploymentOutputFilename = 'test-release-deployment.log';
  if (deployAirnode.bool) {
    // Running create-airnode-config requires a new deployment, hence they're grouped together
    executeCommandSync('yarn create-airnode-config');
    executeCommandSync('yarn create-airnode-secrets');
    executeCommandSync(
      `yarn deploy-airnode api3/airnode-deployer${dockerImgSuffix}:${releaseVersion}`,
      'inherit',
      deploymentOutputFilename
    );
  }
  const deploymentOutput = readFileSync(`${airnodeExamplesPath}/${deploymentOutputFilename}`).toString();
  const gatewayUrls = extractGatewayUrls(deploymentOutput);

  executeCommandSync('yarn deploy-requester');
  executeCommandSync('yarn derive-and-fund-sponsor-wallet');
  executeCommandSync('yarn sponsor-requester');
  // Wait for 30 seconds as sometimes sponsorship will not be recognized immediately
  console.log('Waiting for 30 seconds before making a request...');
  await new Promise((resolve) => setTimeout(resolve, 30000));
  executeCommandSync('yarn make-request');
  executeCommandSync('yarn make-withdrawal-request');

  const httpConfig = {
    method: 'post',
    // triggers.http[0].endpointId from coingecko-http-gateways config.json
    url: `${gatewayUrls.httpGatewayUrl}/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4`,
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({
      parameters: {
        coinId: 'ethereum',
        _path: 'market_data.current_price.usd',
      },
    }),
  };

  console.log('Making HTTP request...');
  const httpResponse = await axios.request(httpConfig);
  console.log(`HTTP gateway price value: ${httpResponse.data.values}`);

  const signedConfig = {
    method: 'post',
    maxBodyLength: Infinity,
    // triggers.httpSignedData[0].endpointId from coingecko-http-gateways config.json
    url: `${gatewayUrls.signedHttpGatewayUrl}/0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4`,
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({
      encodedParameters:
        // From coingecko-http-gateways integration README for encoded 'ethereum' coinId
        '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000',
    }),
  };

  console.log('Making HTTP signed gateway request...');
  const signedResponse = await axios.request(signedConfig);
  console.log(`Signed http gateway JSON response: ${JSON.stringify(signedResponse.data)}`);

  executeCommandSync(
    `docker run -it --rm -v "${airnodeExamplesPath}/integrations/${integration}:/app/config" ` +
      `api3/airnode-deployer${dockerImgSuffix}:${releaseVersion} list`,
    'inherit'
  );

  await promptKeyPress('Ready to remove the Airnode deployment?');
  executeCommandSync(`yarn remove-airnode api3/airnode-deployer${dockerImgSuffix}:${releaseVersion}`, 'inherit');

  console.log('Testing success.');
};

main();
