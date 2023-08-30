import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ethers } from 'ethers';
import { Config, DEFAULT_PATH_KEY } from '@api3/airnode-node';
import { logger } from '@api3/airnode-utilities';
import { runCommand, runCommandInBackground } from '../utils';

const integration = 'coingecko-cross-chain-authorizer';

const chooseIntegration = () => {
  // We can't use the interactive script to choose the integration, so we specify the details manually
  const content = JSON.stringify(
    {
      integration: integration,
      airnodeType: 'local',
      network: 'localhost',
      mnemonic: 'test test test test test test test test test test test junk',
      providerUrl: 'http://127.0.0.1:8545/',
      // cross-chain is the same chain in E2E testing
      crossChainNetwork: 'localhost',
      crossChainProviderUrl: 'http://127.0.0.1:8545/',
      crossChainMnemonic: 'test test test test test test test test test test test junk',
    },
    null,
    2
  );
  writeFileSync(join(__dirname, '../../integration-info.json'), content);
};

const removeFulfillmentGasLimit = () => {
  const configPath = join(__dirname, `../../integrations/${integration}/config.json`);
  const config: Config = JSON.parse(readFileSync(configPath, 'utf8'));
  delete config.chains[0].options.fulfillmentGasLimit;
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  return config;
};

describe('Coingecko integration with containerized Airnode and hardhat', () => {
  it('works', () => {
    chooseIntegration();

    runCommand('yarn deploy-rrp');
    runCommand('yarn deploy-rrp-dry-run');
    runCommand('yarn create-airnode-config');
    runCommand('yarn create-airnode-secrets');
    const config = removeFulfillmentGasLimit();
    runCommand(`yarn ts-node integrations/${integration}/deploy-authorizers-and-update-config`);
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
      const priceStr = priceText.split('USD')[0].trim();
      const price = Number(priceStr);
      logger.log(`Blockchain request: The Ethereum price is ${price} USD.`);

      const endpointId = config.triggers.rrp[0].endpointId;
      const timesReservedParameter = config.ois[0].endpoints[0].reservedParameters.find((rp) => rp.name === '_times');
      const timesValue = Number(timesReservedParameter!.fixed);

      const httpResponse = runCommand(
        `curl --silent --show-error -X POST -H 'Content-Type: application/json' -d '{"parameters": {"coinId": "ethereum"}}' 'http://localhost:3000/http-data/${DEFAULT_PATH_KEY}/${endpointId}'`
      );
      const httpGatewayPrice = Number(JSON.parse(httpResponse).values[0]) / timesValue;
      expect(httpGatewayPrice).toEqual(expect.any(Number));
      logger.log(`HTTP Gateway request: The Ethereum price is ${price} USD.`);

      const signedHttpResponse = runCommand(
        `curl --silent --show-error -X POST -H 'Content-Type: application/json' -d '{"encodedParameters": "0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000657468657265756d000000000000000000000000000000000000000000000000"}' 'http://localhost:3000/http-signed-data/${DEFAULT_PATH_KEY}/${endpointId}'`
      );
      const encodedValue = JSON.parse(signedHttpResponse).encodedValue;
      const decodedBigNumber: ethers.BigNumber = ethers.utils.defaultAbiCoder.decode(['int256'], encodedValue)[0];
      const signedGatewayPrice = decodedBigNumber.toNumber() / timesValue;
      expect(signedGatewayPrice).toEqual(expect.any(Number));
      logger.log(`Signed HTTP Gateway request: The Ethereum price is ${price} USD.`);

      // Values returned by all three requests should be similar
      const allowedDifference = 50; // very conservative
      expect(Math.abs(httpGatewayPrice - signedGatewayPrice)).toBeLessThan(allowedDifference);
      expect(Math.abs(httpGatewayPrice - price)).toBeLessThan(allowedDifference);
      expect(Math.abs(signedGatewayPrice - price)).toBeLessThan(allowedDifference);

      logger.log('All three requests returned similar Ethereum price values.');
    } finally {
      runCommand('yarn stop-local-airnode');
    }
  });
});
