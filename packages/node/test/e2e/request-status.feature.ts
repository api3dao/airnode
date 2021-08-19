import fs from 'fs';
import { ethers } from 'ethers';
import { encode } from '@api3/airnode-abi';
import { ReservedParameterName } from '@api3/ois';
import * as handlers from '../../src/workers/local-handlers';
import * as e2e from '../setup/e2e';
import * as fixtures from '../fixtures';
import { RequestErrorCode } from '../../src/types';

it('sets the correct status code for both successful and failed requests', async () => {
  jest.setTimeout(45_000);

  const provider = e2e.buildProvider();

  const baseParameters = [
    { type: 'bytes32', name: 'to', value: 'USD' },
    { type: 'bytes32', name: ReservedParameterName.Type, value: 'int256' },
    { type: 'bytes32', name: ReservedParameterName.Path, value: 'result' },
    { type: 'bytes32', name: ReservedParameterName.Times, value: '1000000' },
    { type: 'bytes32', name: ReservedParameterName.RelayMetadata, value: 'v1' },
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
  const deployment = await e2e.deployAirnodeRrp(deployConfig);

  await e2e.makeRequests(deployConfig, deployment);

  const nodeSettings = fixtures.buildNodeSettings({
    airnodeWalletMnemonic: deployConfig.airnodes.CurrencyConverterAirnode.mnemonic,
  });
  const chain = e2e.buildChainConfig(deployment.contracts);
  const config = fixtures.buildConfig({ chains: [chain], nodeSettings });
  jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(config));

  await handlers.startCoordinator();

  const logs = await e2e.fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  // We need to use the encoded parameters to find out which request is which
  const encodedValidParams = encode(validParameters);
  const validRequest = logs.find((log) => log.args.parameters === encodedValidParams);
  const validFulfillment = logs.find(
    (log) => log.args.requestId === validRequest!.args.requestId && log.name === 'MadeTemplateRequest'
  );
  // The API responds with 723.392028 which multipled by the _times parameter
  const validResponseValue = ethers.BigNumber.from(validFulfillment!.args.data).toString();
  expect(validResponseValue).toEqual('723392028');
  // 0 indicates success
  expect(validFulfillment!.args.statusCode.toString()).toEqual('0');

  const encodedInvalidParams = encode(invalidParameters);
  const invalidRequest = logs.find((log) => log.args.parameters === encodedInvalidParams);
  const invalidFulfillment = logs.find(
    (log) => log.args.requestId === invalidRequest!.args.requestId && log.name === 'MadeTemplateRequest'
  );
  // There is no valid response data to return so this is empty
  const invalidResponseValue = ethers.BigNumber.from(invalidFulfillment!.args.data).toString();
  expect(invalidResponseValue).toEqual('0');
  // A status code > 1 indicates an error
  expect(invalidFulfillment!.args.statusCode.toString()).toEqual(RequestErrorCode.ApiCallFailed.toString());
});
