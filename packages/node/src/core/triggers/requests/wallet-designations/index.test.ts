import { ethers } from 'ethers';
import * as providerState from '../../../providers/state';
import { ProviderState } from '../../../../types';
import * as walletDesignations from './index';

const requestLog: any = {
  args: {
    providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
    requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
    walletDesignationRequestId: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
    walletInd: ethers.BigNumber.from('2'),
    depositAmount: ethers.BigNumber.from('250'),
  },
  topic: '0x54731539873419bbdf008e1d7a666aeed0a8e141953b2dd4ba187dba3981bfc3',
};

const fulfilledLog: any = {
  args: {
    providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
    requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
    walletDesignationRequestId: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
    walletAddress: '0x1ad5E850C0F89DE5b4892c952d6B59eE6CA48Ec2',
    walletInd: ethers.BigNumber.from('2'),
  },
  topic: '0x82a39020b75d675eeedadd41636e88c5e43c4604955bbfb64f6017aa9ae39ba6',
};

describe('mapBaseRequests', () => {
  let state: ProviderState;

  beforeEach(() => {
    const config = { chainId: 1234, url: 'https://some.provider', name: 'test-provider' };
    state = providerState.create(config, 0);
  });

  it('returns WalletDesignation base requests', () => {
    const res = walletDesignations.mapBaseRequests(state, [requestLog]);
    expect(res).toEqual([
      {
        depositAmount: ethers.BigNumber.from('250'),
        id: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
        providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
        requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
        valid: true,
        walletIndex: ethers.BigNumber.from('2'),
      },
    ]);
  });

  it('ignores fulfilled WalletDesignation requests', () => {
    const res = walletDesignations.mapBaseRequests(state, [requestLog, fulfilledLog]);
    expect(res).toEqual([]);
  });

  it('ignores duplicate WalletDesignation requests', () => {
    const res = walletDesignations.mapBaseRequests(state, [requestLog, requestLog, requestLog]);
    expect(res).toEqual([
      {
        depositAmount: ethers.BigNumber.from('250'),
        id: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
        providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
        requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
        valid: true,
        walletIndex: ethers.BigNumber.from('2'),
      },
    ]);
  });
});
