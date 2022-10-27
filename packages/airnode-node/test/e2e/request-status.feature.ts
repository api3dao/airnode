import { ethers } from 'ethers';
import { encode } from '@api3/airnode-abi';
import { startCoordinator } from '../../src/workers/local-handlers';
import { operation } from '../fixtures';
import { RequestErrorMessage } from '../../src/types';
import { deployAirnodeAndMakeRequests, fetchAllLogs, increaseTestTimeout } from '../setup/e2e';

increaseTestTimeout();

it('sets the correct status code for both successful and failed requests', async () => {
  const baseParameters = [
    { type: 'string32', name: 'to', value: 'USD' },
    { type: 'string32', name: '_type', value: 'int256' },
    { type: 'string32', name: '_path', value: 'result' },
    { type: 'string32', name: '_times', value: '1000000' },
  ];
  // Returns a 404
  const invalidParameters = [...baseParameters, { type: 'string32', name: 'from', value: 'UNKNOWN_COIN' }];
  const validParameters = [...baseParameters, { type: 'string32', name: 'from', value: 'ETH' }];
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
  // The API responds with 723.39202 which is multiplied by the _times parameter
  const validResponseValue = ethers.BigNumber.from(validFulfillment!.args.data).toString();
  expect(validResponseValue).toEqual('723392020');

  const encodedInvalidParams = encode(invalidParameters);
  const invalidRequest = logs.find((log) => log.args.parameters === encodedInvalidParams);
  const failedRequest = logs.find(
    (log) => log.args.requestId === invalidRequest!.args.requestId && log.name === 'FailedRequest'
  );
  // The error message will contain the status code, but not the API error message
  expect(failedRequest!.args.errorMessage).toEqual(`${RequestErrorMessage.ApiCallFailed} with status code 404`);
});
