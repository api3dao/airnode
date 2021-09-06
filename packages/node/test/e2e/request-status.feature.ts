import { ethers } from 'ethers';
import { encode } from '@api3/airnode-abi';
import { ReservedParameterName } from '@api3/ois';
import { startCoordinator } from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import { RequestErrorCode } from '../../src/types';
import { deployAirnodeAndMakeRequests, fetchAllLogs, increaseTestTimeout } from '../setup/e2e';

it('sets the correct status code for both successful and failed requests', async () => {
  increaseTestTimeout();

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
    operation.buildFullRequest({ parameters: invalidParameters }),
    operation.buildFullRequest({ parameters: validParameters }),
  ];
  const { provider, deployment } = await deployAirnodeAndMakeRequests(__filename, requests);

  await startCoordinator();

  const logs = await fetchAllLogs(provider, deployment.contracts.AirnodeRrp);

  // We need to use the encoded parameters to find out which request is which
  const encodedValidParams = encode(validParameters);
  const validRequest = logs.find((log) => log.args.parameters === encodedValidParams);
  const validFulfillment = logs.find(
    (log) => log.args.requestId === validRequest!.args.requestId && log.name === 'FulfilledRequest'
  );
  // The API responds with 723.392028 which multipled by the _times parameter
  const validResponseValue = ethers.BigNumber.from(validFulfillment!.args.data).toString();
  expect(validResponseValue).toEqual('723392028');
  // 0 indicates success
  expect(validFulfillment!.args.statusCode.toString()).toEqual('0');

  const encodedInvalidParams = encode(invalidParameters);
  const invalidRequest = logs.find((log) => log.args.parameters === encodedInvalidParams);
  const invalidFulfillment = logs.find(
    (log) => log.args.requestId === invalidRequest!.args.requestId && log.name === 'FulfilledRequest'
  );
  // There is no valid response data to return so this is empty
  const invalidResponseValue = ethers.BigNumber.from(invalidFulfillment!.args.data).toString();
  expect(invalidResponseValue).toEqual('0');
  // A status code > 1 indicates an error
  expect(invalidFulfillment!.args.statusCode.toString()).toEqual(RequestErrorCode.ApiCallFailed.toString());
});
