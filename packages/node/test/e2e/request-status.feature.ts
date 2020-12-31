import fs from 'fs';
import { encode } from '@airnode/airnode-abi';
import * as handlers from '../../src/workers/local-handlers';
import * as operation from '../setup/e2e/deployment';
import * as e2eUtils from '../setup/e2e/utils';
import * as fixtures from '../fixtures';
import { RequestErrorCode } from '../../src/types';

it('sets the correct status code for both successful and failed requests', async () => {
  jest.setTimeout(45_000);

  const provider = e2eUtils.buildProvider();

  const baseParameters = [
    { type: 'bytes32', name: 'to', value: 'USD' },
    { type: 'bytes32', name: '_type', value: 'int256' },
    { type: 'bytes32', name: '_path', value: 'result' },
    { type: 'bytes32', name: '_times', value: '100000' },
  ];
  const invalidParameters = [...baseParameters, { type: 'bytes32', name: 'from', value: 'UNKNOWN_COIN' }];
  const validParameters = [...baseParameters, { type: 'bytes32', name: 'from', value: 'ETH' }];
  const requests = [
    fixtures.operation.buildFullRequest({ parameters: invalidParameters }),
    fixtures.operation.buildFullRequest({ parameters: validParameters }),
  ];

  const deployerIndex = e2eUtils.getDeployerIndex(__filename);
  const deployConfig = fixtures.operation.buildDeployConfig({ deployerIndex, requests });
  const deployment = await operation.deployAirnode(deployConfig);

  process.env.MASTER_KEY_MNEMONIC = deployConfig.apiProviders.CurrencyConverterAPI.mnemonic;

  await operation.makeRequests(deployConfig, deployment);

  const contracts = {
    Airnode: deployment.contracts.Airnode,
    Convenience: deployment.contracts.Convenience,
  };

  const chain = e2eUtils.buildChainConfig(contracts);
  const nodeSettings = fixtures.buildNodeSettings({ chains: [chain] });
  const config = fixtures.buildConfig({ nodeSettings });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const logs = await e2eUtils.fetchAllLogs(provider, deployment.contracts.Airnode);

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
