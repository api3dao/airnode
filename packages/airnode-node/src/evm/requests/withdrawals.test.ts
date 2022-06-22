import { RequestedWithdrawalEvent } from '@api3/airnode-protocol';
import * as withdrawals from './withdrawals';
import { parseAirnodeRrpLog } from './event-logs';
import * as fixtures from '../../../test/fixtures';

describe('initialize (Withdrawal)', () => {
  it('builds a withdrawal request', () => {
    const event = fixtures.evm.logs.buildRequestedWithdrawal();
    const parsedLog = parseAirnodeRrpLog<'RequestedWithdrawal'>(event);
    const parseLogWithMetadata = {
      parsedLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      minConfirmations: 0,
      transactionHash: event.transactionHash,
      logIndex: 0,
      chainId: '31137',
    };
    const res = withdrawals.initialize(parseLogWithMetadata);
    expect(res).toEqual({
      airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
      id: '0xcadc095f1dc6808a34d6166a72e3c3bb039fb401a5d90a270091aa1d25e4e342',
      chainId: '31137',
      metadata: {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        blockNumber: 10716082,
        currentBlock: 10716085,
        minConfirmations: 0,
        transactionHash: event.transactionHash,
        logIndex: 0,
      },
      sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
    });
  });
});

describe('updateFulfilledRequests (Withdrawal)', () => {
  it('drops fulfilled withdrawals', () => {
    const id = '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124';
    const withdrawal = fixtures.requests.buildWithdrawal({ id });
    const [logs, requests] = withdrawals.dropFulfilledRequests([withdrawal], [id]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${id} (withdrawal) has already been fulfilled`,
      },
    ]);
    expect(requests.length).toEqual(0);
  });

  it('returns the request as is if it is not fulfilled', () => {
    const withdrawal = fixtures.requests.buildWithdrawal();
    const [logs, requests] = withdrawals.dropFulfilledRequests([withdrawal], ['0xunknownid']);
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
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      minConfirmations: 0,
      transactionHash: event.transactionHash,
      logIndex: 0,
      chainId: '31137',
    };
    const [logs, res] = withdrawals.mapRequests([parsedLogWithMetadata]);
    expect(logs).toEqual([]);
    expect(res).toEqual([
      {
        airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
        sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
        id: '0xcadc095f1dc6808a34d6166a72e3c3bb039fb401a5d90a270091aa1d25e4e342',
        chainId: '31137',
        metadata: {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockNumber: 10716082,
          currentBlock: 10716085,
          minConfirmations: 0,
          transactionHash: event.transactionHash,
          logIndex: 0,
        },
        sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
      },
    ]);
  });

  it('drops fulfilled withdrawal requests', () => {
    const requestEvent = fixtures.evm.logs.buildRequestedWithdrawal();
    const fulfillEvent = fixtures.evm.logs.buildFulfilledWithdrawal();
    const requestLog = parseAirnodeRrpLog<RequestedWithdrawalEvent>(requestEvent);
    const fulfillLog = parseAirnodeRrpLog<RequestedWithdrawalEvent>(fulfillEvent);

    const requestLogWithMetadata = {
      parsedLog: requestLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716082,
      currentBlock: 10716085,
      minConfirmations: 0,
      transactionHash: requestEvent.transactionHash,
      logIndex: 0,
      chainId: '31137',
    };
    const fulfillLogWithMetadata = {
      parsedLog: fulfillLog,
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 10716084,
      currentBlock: 10716087,
      minConfirmations: 0,
      transactionHash: fulfillEvent.transactionHash,
      logIndex: 0,
      chainId: '31137',
    };

    const [logs, requests] = withdrawals.mapRequests([requestLogWithMetadata, fulfillLogWithMetadata]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${requestLog.args.withdrawalRequestId} (withdrawal) has already been fulfilled`,
      },
    ]);
    expect(requests.length).toEqual(0);
  });
});
