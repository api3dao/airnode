const requestMock = jest.fn();
const getIdTokenClientMock = jest.fn().mockImplementation(() => ({
  request: requestMock,
}));
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getIdTokenClient: getIdTokenClientMock,
  })),
}));

import * as gcp from './gcp';
import * as fixtures from '../../../test/fixtures';
import { WorkerParameters } from '../../types';

describe('spawn', () => {
  fixtures.setEnvVariables({ AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey() });

  it('derives the function URL, authenticates, invokes and returns the response', async () => {
    requestMock.mockImplementationOnce(() => ({ data: { value: 7777 } }));
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: {
        type: 'gcp',
        region: 'us-east1',
        projectId: 'projectId123',
        disableConcurrencyReservations: false,
      },
    });
    const logOptions = fixtures.buildLogOptions();
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state, logOptions },
    };
    const url = 'https://us-east1-projectId123.cloudfunctions.net/airnode-local02cce763-run';

    const res = await gcp.spawn(parameters);
    expect(res).toEqual({ value: 7777 });

    expect(getIdTokenClientMock).toHaveBeenCalledTimes(1);
    expect(getIdTokenClientMock).toHaveBeenCalledWith(url);

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith({
      url,
      method: 'POST',
      data: parameters.payload,
    });
  });

  it('throws an error if the cloud function returns an error', async () => {
    requestMock.mockRejectedValueOnce(new Error('Something went wrong'));
    const state = fixtures.buildEVMProviderState();
    const workerOpts = fixtures.buildWorkerOptions({
      cloudProvider: {
        type: 'gcp',
        region: 'us-east1',
        projectId: 'projectId123',
        disableConcurrencyReservations: false,
      },
    });
    const logOptions = fixtures.buildLogOptions();
    const parameters: WorkerParameters = {
      ...workerOpts,
      payload: { functionName: 'initializeProvider', state, logOptions },
    };
    const url = 'https://us-east1-projectId123.cloudfunctions.net/airnode-local02cce763-run';

    await expect(gcp.spawn(parameters)).rejects.toThrow(new Error('Something went wrong'));

    expect(getIdTokenClientMock).toHaveBeenCalledTimes(1);
    expect(getIdTokenClientMock).toHaveBeenCalledWith(url);

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith({
      url,
      method: 'POST',
      data: parameters.payload,
    });
  });
});
