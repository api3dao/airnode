import { RequestedWithdrawalEvent } from '@api3/protocol';
import * as withdrawals from './withdrawals';
import { parseAirnodeRrpLog } from './event-logs';
import * as fixtures from '../../../test/fixtures';
import { RequestStatus } from '../../types';

describe('initialize (Withdrawal)', () => {
  it('builds a withdrawal request', () => {
    const event = fixtures.evm.logs.buildRequestedWithdrawal();
    const parsedLog = parseAirnodeRrpLog<'RequestedWithdrawal'>(event);
    const parseLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const res = withdrawals.initialize(parseLogWithMetadata);
    expect(res).toEqual({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      sponsorWalletAddress: '0x295e2190B3574Ea6ab17b32AbaF77BAdF2aA57C4',
      id: '0xed9362918d8f2df5d4fbae9a684d0045914b90ff61f4d9ce1bad8fcce2f5e720',
      metadata: {
        blockNumber: 10716082,
        currentBlock: 10716085,
        ignoreBlockedRequestsAfterBlocks: 20,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      sponsorAddress: '0x3409cf0Ef3E984018819fD370A338F0BDc182239',
      status: RequestStatus.Pending,
    });
  });
});

describe('updateFulfilledRequests (Withdrawal)', () => {
  it('updates the status of fulfilled withdrawals', () => {
    const id = '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124';
    const withdrawal = fixtures.requests.buildWithdrawal({ id });
    const [logs, requests] = withdrawals.updateFulfilledRequests([withdrawal], [id]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${id} (withdrawal) has already been fulfilled`,
      },
    ]);
    expect(requests).toEqual([
      {
        airnodeAddress: 'airnodeAddress',
        sponsorWalletAddress: 'sponsorWalletAddress',
        id,
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716090,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: 'logTransactionHash',
        },
        sponsorAddress: '0x69e2B095fbAc6C3f9E528Ef21882b86BF1595181',
        status: RequestStatus.Fulfilled,
      },
    ]);
  });

  it('returns the request as is if it is not fulfilled', () => {
    const withdrawal = fixtures.requests.buildWithdrawal();
    const [logs, requests] = withdrawals.updateFulfilledRequests([withdrawal], ['0xunknownid']);
    expect(logs).toEqual([]);
    expect(requests).toEqual([withdrawal]);
  });
});

describe('mapRequests (Withdrawal)', () => {
  it('initializes and returns withdrawal requests', () => {
    const event = fixtures.evm.logs.buildRequestedWithdrawal();
    const parsedLog = parseAirnodeRrpLog<RequestedWithdrawalEvent>(event);
    const parsedLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const [logs, res] = withdrawals.mapRequests([parsedLogWithMetadata]);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        sponsorWalletAddress: '0x295e2190B3574Ea6ab17b32AbaF77BAdF2aA57C4',
        id: '0xed9362918d8f2df5d4fbae9a684d0045914b90ff61f4d9ce1bad8fcce2f5e720',
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716085,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
        },
        sponsorAddress: '0x3409cf0Ef3E984018819fD370A338F0BDc182239',
        status: RequestStatus.Pending,
      },
    ]);
  });

  it('updates the status of fulfilled withdrawal requests', () => {
    const requestEvent = fixtures.evm.logs.buildRequestedWithdrawal();
    const fulfillEvent = fixtures.evm.logs.buildFulfilledWithdrawal();
    const requestLog = parseAirnodeRrpLog<RequestedWithdrawalEvent>(requestEvent);
    const fulfillLog = parseAirnodeRrpLog<RequestedWithdrawalEvent>(fulfillEvent);

    const requestLogWithMetadata = {
      parsedLog: requestLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const fulfillLogWithMetadata = {
      parsedLog: fulfillLog,
      blockNumber: 10716084,
      currentBlock: 10716087,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };

    const [logs, requests] = withdrawals.mapRequests([requestLogWithMetadata, fulfillLogWithMetadata]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${requestLog.args.withdrawalRequestId} (withdrawal) has already been fulfilled`,
      },
    ]);
    expect(requests.length).toEqual(1);
    expect(requests[0].id).toEqual(requestLog.args.withdrawalRequestId);
    expect(requests[0].status).toEqual(RequestStatus.Fulfilled);
  });
});
