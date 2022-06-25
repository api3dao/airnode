import { writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';
import { killBackgroundProcess, runCommand, runCommandInBackground } from '../utils';

const chooseIntegration = () => {
  // We can't use the interactive script to choose the integration, so we specify the details manually
  const content = JSON.stringify(
    {
      integration: 'coingecko',
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

describe('Coingecko integration with containerized Airnode and hardhat', () => {
  it('works', () => {
    chooseIntegration();

    runCommand('yarn deploy-rrp');
    runCommand('yarn create-airnode-config');
    runCommand('yarn create-airnode-secrets');

    const airnodeDocker = runCommandInBackground('yarn run-airnode-locally');

    // Try running the rest of the commands, but make sure to kill the Airnode running in background process gracefully.
    // We need to do this otherwise Airnode will continue running in the background forever
    const operation = () => {
      runCommand('yarn deploy-requester');
      runCommand('yarn derive-and-fund-sponsor-wallet');
      runCommand('yarn sponsor-requester');
      const response = runCommand('yarn make-request');

      killBackgroundProcess(airnodeDocker);

      const pathOfResponseText = 'Ethereum price is';
      expect(response).toContain(pathOfResponseText);

      const priceText = response.split(pathOfResponseText)[1];
      expect(priceText).toContain('USD');

      const price = priceText.split('USD')[0].trim();
      expect(Number(price)).toEqual(expect.any(Number));
      expect(Number(price).toString()).toBe(price);

      logger.log(`The Ethereum price is ${price} USD.`);
    };

    const goOperation = goSync(operation);
    if (!goOperation.success) {
      killBackgroundProcess(airnodeDocker);
      throw goOperation.error;
    }
  });
});
