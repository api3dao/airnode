import { ethers } from 'ethers';
import * as providerState from '../../../providers/state';
import { ProviderState, RequestStatus } from '../../../../types';
import * as walletDesignations from './index';

const requestLog: any = {
  parsedLog: {
    args: {
      providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
      requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
      walletDesignationRequestId: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
      walletInd: ethers.BigNumber.from('2'),
      depositAmount: ethers.BigNumber.from('250'),
    },
    topic: '0x54731539873419bbdf008e1d7a666aeed0a8e141953b2dd4ba187dba3981bfc3',
  },
  blockNumber: 10716082,
  transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
};

const fulfilledLog: any = {
  parsedLog: {
    args: {
      providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
      requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
      walletDesignationRequestId: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
      walletAddress: '0x1ad5E850C0F89DE5b4892c952d6B59eE6CA48Ec2',
      walletInd: ethers.BigNumber.from('2'),
    },
    topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6',
  },
  blockNumber: 10716083,
  transactionHash: '0xdc9cadc2a505643b89ca739b3cc4022c2f1c3652d873160eb18e20bb3e45c57e',
};

describe('mapBaseRequests (WalletDesignation)', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('returns WalletDesignation base requests', () => {
    const res = walletDesignations.mapBaseRequests(state, [requestLog]);
    expect(res).toEqual([
      {
        depositAmount: '250',
        id: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
        logMetadata: {
          blockNumber: 10716082,
          transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
        },
        providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
        requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
        status: RequestStatus.Pending,
        walletIndex: '2',
      },
    ]);
  });

  it('updates the status of fulfilled WalletDesignation requests', () => {
    const res = walletDesignations.mapBaseRequests(state, [requestLog, fulfilledLog]);
    expect(res).toEqual([
      {
        depositAmount: '250',
        id: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
        logMetadata: {
          blockNumber: 10716082,
          transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
        },
        providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
        requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
        status: RequestStatus.Fulfilled,
        walletIndex: '2',
      },
    ]);
  });

  it('filers out duplicate WalletDesignation requests', () => {
    const res = walletDesignations.mapBaseRequests(state, [requestLog, requestLog, requestLog]);
    expect(res).toEqual([
      {
        depositAmount: '250',
        id: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
        logMetadata: {
          blockNumber: 10716082,
          transactionHash: '0xb1c9cce6d0f054958cf8542c5cdc6b558c6d628f8e2bac37fca0126c5793f11c',
        },
        providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
        requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
        status: RequestStatus.Pending,
        walletIndex: '2',
      },
    ]);
  });
});
