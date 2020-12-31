import fs from 'fs';
import { encode } from '@airnode/airnode-abi';
import * as handlers from '../../src/workers/local-handlers';
import * as e2e from '../setup/e2e';
import * as fixtures from '../fixtures';
import { RequestErrorCode } from '../../src/types';

it('sets the correct status code for both successful and failed requests', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const baseParameters = [
    { type: 'bytes32', name: 'to', value: 'USD' },
    { type: 'bytes32', name: '_type', value: 'int256' },
    { type: 'bytes32', name: '_path', value: 'result' },
    { type: 'bytes32', name: '_times', value: '100000' },
  ];
  // Returns a 404
  const invalidParameters = [...baseParameters, { type: 'bytes32', name: 'from', value: 'UNKNOWN_COIN' }];
  const validParameters = [...baseParameters, { type: 'bytes32', name: 'from', value: 'ETH' }];
  const requests = [
    fixtures.operation.buildFullRequest({ parameters: invalidParameters }),
    fixtures.operation.buildFullRequest({ parameters: validParameters }),
  ];

  const deployerIndex = e2e.getDeployerIndex(__filename);
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });
  const deployment = await e2e.deployAirnode(deployConfig);

  process.env.MASTER_KEY_MNEMONIC = deployConfig.apiProviders.CurrencyConverterAPI.mnemonic;

  await e2e.makeRequests(deployConfig, deployment);

  const chain = e2e.buildChainConfig(deployment.contracts);
  const nodeSettings = fixtures.buildNodeSettings({ chains: [chain] });
  const config = fixtures.buildConfig({ nodeSettings });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const logs = await e2e.fetchAllLogs(provider, deployment.contracts.Airnode);

  // We need to use the encoded parameters to find out which request is which
  const encodedValidParams = encode(validParameters);
  const validRequest = logs.find((log) => log.args.parameters === encodedValidParams);
  const validFulfillment = logs.find(
    (log) => log.args.requestId === validRequest!.args.requestId && log.name === 'ClientRequestFulfilled'
  );
  expect(validFulfillment!.args.statusCode.toString()).toEqual('0');

  const encodedInvalidParams = encode(invalidParameters);
  const invalidRequest = logs.find((log) => log.args.parameters === encodedInvalidParams);
  const invalidFulfillment = logs.find(
    (log) => log.args.requestId === invalidRequest!.args.requestId && log.name === 'ClientRequestFulfilled'
  );
  expect(invalidFulfillment!.args.statusCode.toString()).toEqual(RequestErrorCode.ApiCallFailed.toString());
});
