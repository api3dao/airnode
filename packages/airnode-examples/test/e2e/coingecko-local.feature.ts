import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@api3/airnode-utilities';
import { runCommand, runCommandInBackground } from '../utils';
import { readIntegrationInfo } from '../../src';

const chooseIntegration = () => {
  // We can't use the interactive script to choose the integration, so we specify the details manually
  const content = JSON.stringify(
    {
      integration: 'coingecko-e2e',
      airnodeType: 'local',
      network: 'localhost',
      mnemonic: 'test test test test test test test test test test test junk',
      providerUrl: 'http://127.0.0.1:8545/',
    },
    null,
    2
  );
  writeFileSync(join(__dirname, '../../integration-info.json'), content);
};

const replacePlaceholdersInConfig = (everythingAuthorizer: string, nothingAuthorizer: string) => {
  const integrationInfo = readIntegrationInfo();
  const secretsPath = join(__dirname, `../../integrations/`, integrationInfo.integration, `config.json`);
  const rawSecrets = readFileSync(secretsPath).toString();
  writeFileSync(
    secretsPath,
    rawSecrets
      .replace('EVERYTHING_AUTHORIZER_FILLED_IN_E2E_TEST', `${everythingAuthorizer}`)
      .replace('NOTHING_AUTHORIZER_FILLED_IN_E2E_TEST', `${nothingAuthorizer}`)
  );
};

describe('Coingecko integration with containerized Airnode and hardhat', () => {
  it('works', () => {
    chooseIntegration();

    runCommand('yarn deploy-rrp');
    runCommand('yarn create-airnode-config');
    runCommand('yarn create-airnode-secrets');

    // Testing cross-chain authorizers:
    // Same-chain authorizer (`NothingAuthorizer`) does not authorize request, but
    // cross-chain authorizer (`EverythingAuthorizer`) does, resulting in a fulfilled request
    // See config.json for how this works using just one local Hardhat instance
    const authorizerResponses = runCommand('yarn ts-node ./integrations/coingecko-e2e/deploy-authorizers');
    const everythingAuthorizerText = 'EverythingAuthorizer deployed to address:';
    const nothingAuthorizerText = 'NothingAuthorizer deployed to address:';
    expect(authorizerResponses).toContain(everythingAuthorizerText);
    expect(authorizerResponses).toContain(nothingAuthorizerText);
    const everythingAuthorizer = authorizerResponses.split(everythingAuthorizerText)[1].split('\n')[0].trim();
    const nothingAuthorizer = authorizerResponses.split(nothingAuthorizerText)[1].split('\n')[0].trim();
    replacePlaceholdersInConfig(everythingAuthorizer, nothingAuthorizer);

    runCommandInBackground('yarn run-airnode-locally');

    // Try running the rest of the commands, but make sure to kill the Airnode running in background process gracefully.
    // We need to do this otherwise Airnode will continue running in the background forever
    try {
      runCommand('yarn deploy-requester');
      runCommand('yarn derive-and-fund-sponsor-wallet');
      runCommand('yarn sponsor-requester');
      const response = runCommand('yarn make-request');

      const pathOfResponseText = 'Ethereum price is';
      expect(response).toContain(pathOfResponseText);

      const priceText = response.split(pathOfResponseText)[1];
      expect(priceText).toContain('USD');

      const price = priceText.split('USD')[0].trim();
      expect(Number(price)).toEqual(expect.any(Number));
      expect(Number(price).toString()).toBe(price);

      logger.log(`The Ethereum price is ${price} USD.`);
    } finally {
      runCommand('yarn stop-local-airnode');
    }
  });
});
