import { writeFileSync } from 'fs';
import { join } from 'path';
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

    runCommand('yarn rebuild-artifacts-container');
    runCommand('yarn rebuild-airnode-container');
    const airnodeDocker = runCommandInBackground('yarn run-airnode-locally');

    // Try running rest of the commands, but make sure to kill the Airnode running in backround process gracefully.
    // We need to do this otherwise Airnode will be running in background forever
    try {
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

      console.log(`The Ethereum price is ${price} USD.`);
    } catch (e) {
      killBackgroundProcess(airnodeDocker);
      throw e;
    }
  });
});
