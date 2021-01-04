import { ethers } from 'ethers';
import * as contracts from '../contracts';
import * as withdrawals from './withdrawals';
import * as fixtures from 'test/fixtures';
import { RequestStatus } from 'src/types';

describe('initialize (Withdrawal)', () => {
  it('builds a withdrawal request', () => {
    const event = fixtures.evm.buildWithdrawalRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
    const parseLogWithMetadata = {
      parsedLog,
      blockNumber: 10716082,
      currentBlock: 10716085,
      ignoreBlockedRequestsAfterBlocks: 20,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };
    const res = withdrawals.initialize(parseLogWithMetadata);
    expect(res).toEqual({
      designatedWallet: '0xeadFE69e7D9E1d369D05DF6a88F687129523e16d',
      destinationAddress: '0x2c826Eb4C68386BCe3389D1782F6e41825B654fC',
      id: '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124',
      metadata: {
        blockNumber: 10716082,
        currentBlock: 10716085,
        ignoreBlockedRequestsAfterBlocks: 20,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
      requesterIndex: '1',
      status: RequestStatus.Pending,
    });
  });
});

describe('updateFulfilledRequests (Withdrawal)', () => {
  it('updates the status of fulfilled withdrawals', () => {
    const id = '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124';
    const withdrawal = fixtures.requests.createWithdrawal({ id });
    const [logs, requests] = withdrawals.updateFulfilledRequests([withdrawal], [id]);
    expect(logs).toEqual([
      {
        level: 'DEBUG',
        message: `Request ID:${id} (withdrawal) has already been fulfilled`,
      },
    ]);
    expect(requests).toEqual([
      {
        designatedWallet: 'designatedWallet',
        destinationAddress: 'destinationAddress',
        id,
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716090,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: 'logTransactionHash',
        },
        providerId: 'providerId',
        requesterIndex: '1',
        status: RequestStatus.Fulfilled,
      },
    ]);
  });

  it('returns the request as is if it is not fulfilled', () => {
    const withdrawal = fixtures.requests.createWithdrawal();
    const [logs, requests] = withdrawals.updateFulfilledRequests([withdrawal], ['0xunknownid']);
    expect(logs).toEqual([]);
    expect(requests).toEqual([withdrawal]);
  });
});

describe('mapRequests (Withdrawal)', () => {
  it('initializes and returns withdrawal requests', () => {
    const event = fixtures.evm.buildWithdrawalRequest();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const parsedLog = airnodeInterface.parseLog(event);
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
        designatedWallet: '0xeadFE69e7D9E1d369D05DF6a88F687129523e16d',
        destinationAddress: '0x2c826Eb4C68386BCe3389D1782F6e41825B654fC',
        id: '0x5104cbd15362576f8591d30ab8a9bf7cd46359da50888732394444660717f124',
        metadata: {
          blockNumber: 10716082,
          currentBlock: 10716085,
          ignoreBlockedRequestsAfterBlocks: 20,
          transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
        },
        providerId: '0x9e5a89de5a7e780b9eb5a61425a3a656f0c891ac4c56c07037d257724af490c9',
        requesterIndex: '1',
        status: RequestStatus.Pending,
      },
    ]);
  });

  it('updates the status of fulfilled withdrawal requests', () => {
    const requestEvent = fixtures.evm.buildWithdrawalRequest();
    const fulfillEvent = fixtures.evm.buildWithdrawalFulfilled();
    const airnodeInterface = new ethers.utils.Interface(contracts.Airnode.ABI);
    const requestLog = airnodeInterface.parseLog(requestEvent);
    const fulfillLog = airnodeInterface.parseLog(fulfillEvent);

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
