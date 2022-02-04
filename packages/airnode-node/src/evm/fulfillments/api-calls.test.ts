import { mockEthers } from '../../../test/mock-utils';

const failMock = jest.fn();
const fulfillMock = jest.fn();
const staticFulfillMock = jest.fn();
mockEthers({
  airnodeRrpMocks: {
    callStatic: {
      fulfill: staticFulfillMock,
    },
    fail: failMock,
    fulfill: fulfillMock,
  },
});

import { ethers } from 'ethers';
import * as apiCalls from './api-calls';
import * as fixtures from '../../../test/fixtures';
import * as wallet from '../wallet';
import { GasTarget, RequestErrorMessage, RequestStatus } from '../../types';
import { AirnodeRrp } from '../contracts';
import { MAXIMUM_ONCHAIN_ERROR_LENGTH } from '../../constants';

const createAirnodeRrpFake = () => new ethers.Contract('address', ['ABI']) as unknown as AirnodeRrp;
const config = fixtures.buildConfig();

describe('submitApiCall', () => {
  const masterHDNode = wallet.getMasterHDNode(config);
  const gasPriceFallback = {
    gasPrice: ethers.BigNumber.from('1000'),
  };
  const gasPrice = {
    maxPriorityFeePerGas: ethers.BigNumber.from(1),
    maxFeePerGas: ethers.BigNumber.from(1000),
  };

  describe('Fulfilled API calls', () => {
    test.each([gasPrice, gasPriceFallback])(
      `does nothing for API call requests that have already been fulfilled - %#`,
      async (gasTarget: GasTarget) => {
        const provider = new ethers.providers.JsonRpcProvider();
        const apiCall = fixtures.requests.buildApiCall({ status: RequestStatus.Fulfilled });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          {
            level: 'DEBUG',
            message: `API call for Request:${apiCall.id} not actioned as it has status:${apiCall.status}`,
          },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual(null);
        expect(staticFulfillMock).not.toHaveBeenCalled();
        expect(fulfillMock).not.toHaveBeenCalled();
        expect(failMock).not.toHaveBeenCalled();
      }
    );
  });

  describe('Blocked API calls non-EIP-1559', () => {
    test.each([gasPrice, gasPriceFallback])(`does not action blocked requests - %#`, async (gasTarget: GasTarget) => {
      const provider = new ethers.providers.JsonRpcProvider();
      const apiCall = fixtures.requests.buildApiCall({ status: RequestStatus.Blocked });
      const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
        gasTarget,
        masterHDNode,
        provider,
      });
      expect(logs).toEqual([
        {
          level: 'INFO',
          message: `API call for Request:apiCallId not actioned as it has status:${RequestStatus.Blocked}`,
        },
      ]);
      expect(err).toEqual(null);
      expect(data).toEqual(null);
      expect(staticFulfillMock).not.toHaveBeenCalled();
      expect(fulfillMock).not.toHaveBeenCalled();
      expect(failMock).not.toHaveBeenCalled();
    });
  });

  describe('Pending API calls', () => {
    test.each([gasPrice, gasPriceFallback])(
      `does nothing for API call requests that do not have a nonce - %#`,
      async (gasTarget: GasTarget) => {
        const provider = new ethers.providers.JsonRpcProvider();
        const apiCall = fixtures.requests.buildApiCall({ nonce: undefined });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          {
            level: 'ERROR',
            message: `API call for Request:${apiCall.id} cannot be submitted as it does not have a nonce`,
          },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual(null);
        expect(staticFulfillMock).not.toHaveBeenCalled();
        expect(fulfillMock).not.toHaveBeenCalled();
        expect(failMock).not.toHaveBeenCalled();
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `successfully tests and submits a fulfill transaction for pending requests - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        staticFulfillMock.mockResolvedValueOnce({ callSuccess: true, callData: '0x' });
        fulfillMock.mockResolvedValueOnce({ hash: '0xtransactionId' });

        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          signature:
            '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          { level: 'DEBUG', message: `Attempting to fulfill API call for Request:${apiCall.id}...` },
          { level: 'INFO', message: `Submitting API call fulfillment for Request:${apiCall.id}...` },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual({
          ...apiCall,
          fulfillment: { hash: '0xtransactionId' },
          status: RequestStatus.Submitted,
        });
        expect(staticFulfillMock).toHaveBeenCalledTimes(1);
        expect(staticFulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(fulfillMock).toHaveBeenCalledTimes(1);
        expect(fulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(failMock).not.toHaveBeenCalled();
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `returns an error if the fulfill transaction for pending requests fails - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        staticFulfillMock.mockResolvedValueOnce({ callSuccess: true, callData: '0x' });
        (fulfillMock as any).mockRejectedValueOnce(new Error('Server did not respond'));
        (fulfillMock as any).mockRejectedValueOnce(new Error('Server did not respond'));

        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          signature:
            '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          { level: 'DEBUG', message: `Attempting to fulfill API call for Request:${apiCall.id}...` },
          { level: 'INFO', message: `Submitting API call fulfillment for Request:${apiCall.id}...` },
          {
            error: new Error('Server did not respond'),
            level: 'ERROR',
            message:
              'Error submitting API call fulfillment transaction for Request:0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          },
        ]);
        expect(err).toEqual(new Error('Server did not respond'));
        expect(data).toEqual(null);
        expect(staticFulfillMock).toHaveBeenCalledTimes(1);
        expect(staticFulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(fulfillMock).toHaveBeenCalledTimes(2);
        expect(fulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(failMock).not.toHaveBeenCalled();
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `submits a fail transaction if the fulfill call would revert with empty string - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        staticFulfillMock.mockResolvedValueOnce({ callSuccess: false, callData: '0x' });
        (failMock as jest.Mock).mockResolvedValueOnce({ hash: '0xfailtransaction' });
        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          signature:
            '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          { level: 'DEBUG', message: `Attempting to fulfill API call for Request:${apiCall.id}...` },
          { level: 'INFO', message: `Submitting API call fail for Request:${apiCall.id}...` },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual({
          ...apiCall,
          fulfillment: { hash: '0xfailtransaction' },
          status: RequestStatus.Submitted,
          errorMessage: 'Fulfill transaction failed',
        });
        expect(staticFulfillMock).toHaveBeenCalledTimes(1);
        expect(staticFulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(fulfillMock).not.toHaveBeenCalled();
        expect(failMock).toHaveBeenCalledTimes(1);
        expect(failMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          'No revert string',
          txOpts
        );
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `submits a fail transaction if the fulfill call would revert with a revert string - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        staticFulfillMock.mockResolvedValueOnce({
          callSuccess: false,
          callData:
            '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000e416c776179732072657665727473000000000000000000000000000000000000',
        });
        (failMock as jest.Mock).mockResolvedValueOnce({ hash: '0xfailtransaction' });
        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          signature:
            '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          { level: 'DEBUG', message: `Attempting to fulfill API call for Request:${apiCall.id}...` },
          { level: 'INFO', message: `Submitting API call fail for Request:${apiCall.id}...` },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual({
          ...apiCall,
          fulfillment: { hash: '0xfailtransaction' },
          status: RequestStatus.Submitted,
          errorMessage: 'Fulfill transaction failed',
        });
        expect(staticFulfillMock).toHaveBeenCalledTimes(1);
        expect(staticFulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(fulfillMock).not.toHaveBeenCalled();
        expect(failMock).toHaveBeenCalledTimes(1);
        expect(failMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          'Always reverts',
          txOpts
        );
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `does nothing if the fulfill test returns nothing - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        staticFulfillMock.mockResolvedValueOnce(null);
        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          signature:
            '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          { level: 'DEBUG', message: `Attempting to fulfill API call for Request:${apiCall.id}...` },
          {
            level: 'ERROR',
            message: `Fulfill attempt for Request:${apiCall.id} responded with unexpected value: 'null'`,
          },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual(null);
        expect(staticFulfillMock).toHaveBeenCalledTimes(1);
        expect(staticFulfillMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(fulfillMock).not.toHaveBeenCalled();
        expect(failMock).not.toHaveBeenCalled();
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `returns an error if everything fails - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        staticFulfillMock.mockRejectedValueOnce(new Error('Server did not respond'));
        staticFulfillMock.mockRejectedValueOnce(new Error('Server did not respond'));
        (failMock as any).mockRejectedValueOnce(new Error('Server still says no'));
        (failMock as any).mockRejectedValueOnce(new Error('Server still says no'));
        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          responseValue: '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          signature:
            '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          { level: 'DEBUG', message: `Attempting to fulfill API call for Request:${apiCall.id}...` },
          {
            error: new Error('Server did not respond'),
            level: 'ERROR',
            message: `Error attempting API call fulfillment for Request:${apiCall.id}`,
          },
          { level: 'INFO', message: `Submitting API call fail for Request:${apiCall.id}...` },
          {
            error: new Error('Server still says no'),
            level: 'ERROR',
            message: `Error submitting API call fail transaction for Request:${apiCall.id}`,
          },
        ]);
        expect(err).toEqual(new Error('Server still says no'));
        expect(data).toEqual(null);
        expect(staticFulfillMock).toHaveBeenCalledTimes(2);
        expect(staticFulfillMock).toHaveBeenNthCalledWith(
          2,
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          '0x448b8ad3a330cf8f269f487881b59efff721b3dfa8e61f7c8fd2480389459ed3',
          '0xda6d5aa27f48aa951ba401c8a779645f7d1fa4a46a5e99eb7da04b4e059449a834ca1058c85dfe8117305265228f8cf7ae64c3ef3c4d1cc191f77807227dac461b',
          txOpts
        );
        expect(fulfillMock).not.toHaveBeenCalled();
        expect(failMock).toHaveBeenCalledTimes(2);
        expect(failMock).toHaveBeenNthCalledWith(
          2,
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          'Server did not respond',
          txOpts
        );
      }
    );
  });

  describe('Errored API calls', () => {
    test.each([gasPrice, gasPriceFallback])(
      `submits a fail transaction with errorMessage for errored requests - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        failMock.mockResolvedValueOnce({ hash: '0xfailtransaction' });
        const apiCall = fixtures.requests.buildApiCall({
          errorMessage: RequestErrorMessage.ApiCallFailed,
          status: RequestStatus.Errored,
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          {
            level: 'INFO',
            message: `Submitting API call fail for Request:${apiCall.id}...`,
          },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual({
          ...apiCall,
          fulfillment: { hash: '0xfailtransaction' },
          status: RequestStatus.Submitted,
          errorMessage: 'API call failed',
        });
        expect(failMock).toHaveBeenCalledTimes(1);
        expect(failMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          RequestErrorMessage.ApiCallFailed,
          txOpts
        );
        expect(staticFulfillMock).not.toHaveBeenCalled();
        expect(fulfillMock).not.toHaveBeenCalled();
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `submits a fail transaction with a trimmed errorMessage for errored requests - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        const longError = 'This very long error message should get trimmed'.repeat(10);
        const trimmedError = longError.substring(0, MAXIMUM_ONCHAIN_ERROR_LENGTH - 3).concat('...');
        failMock.mockResolvedValueOnce({ hash: '0xfailtransaction' });
        const apiCall = fixtures.requests.buildApiCall({
          errorMessage: longError,
          status: RequestStatus.Errored,
          nonce: 5,
        });

        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });

        expect(logs).toEqual([
          {
            level: 'INFO',
            message: `Submitting API call fail for Request:${apiCall.id}...`,
          },
        ]);
        expect(err).toEqual(null);
        expect(data).toEqual({
          ...apiCall,
          fulfillment: { hash: '0xfailtransaction' },
          status: RequestStatus.Submitted,
          errorMessage: longError,
        });
        expect(failMock).toHaveBeenCalledTimes(1);
        expect(failMock).toHaveBeenCalledWith(
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          trimmedError,
          txOpts
        );
        expect(staticFulfillMock).not.toHaveBeenCalled();
        expect(fulfillMock).not.toHaveBeenCalled();
      }
    );

    test.each([gasPrice, gasPriceFallback])(
      `returns an error if the error transaction fails - %#`,
      async (gasTarget: GasTarget) => {
        const txOpts = { gasLimit: 500_000, ...gasTarget, nonce: 5 };
        const provider = new ethers.providers.JsonRpcProvider();
        failMock.mockRejectedValueOnce(new Error('Server did not respond'));
        // We need to do this twice because promise-utils will retry
        failMock.mockRejectedValueOnce(new Error('Server did not respond'));
        const apiCall = fixtures.requests.buildApiCall({
          id: '0xb56b66dc089eab3dc98672ea5e852488730a8f76621fd9ea719504ea205980f8',
          errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: Server did not respond`,
          status: RequestStatus.Errored,
          nonce: 5,
        });
        const [logs, err, data] = await apiCalls.submitApiCall(createAirnodeRrpFake(), apiCall, {
          gasTarget,
          masterHDNode,
          provider,
        });
        expect(logs).toEqual([
          {
            level: 'INFO',
            message: `Submitting API call fail for Request:${apiCall.id}...`,
          },
          {
            error: new Error('Server did not respond'),
            level: 'ERROR',
            message: `Error submitting API call fail transaction for Request:${apiCall.id}`,
          },
        ]);
        expect(err).toEqual(new Error('Server did not respond'));
        expect(data).toEqual(null);
        expect(failMock).toHaveBeenCalledTimes(2);
        expect(failMock).toHaveBeenNthCalledWith(
          2,
          apiCall.id,
          apiCall.airnodeAddress,
          apiCall.fulfillAddress,
          apiCall.fulfillFunctionId,
          `${RequestErrorMessage.ApiCallFailed} with error: Server did not respond`,
          txOpts
        );
        expect(fulfillMock).not.toHaveBeenCalled();
      }
    );
  });
});
