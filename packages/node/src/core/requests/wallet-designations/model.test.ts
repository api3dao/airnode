import { ethers } from 'ethers';
import * as model from './model';

describe('initialize WalletDesignation BaseRequest', () => {
  it('initializes a new WalletDesignation request', () => {
    const log: any = {
      args: {
        providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
        requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
        walletDesignationRequestId: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
        walletInd: ethers.BigNumber.from('2'),
        depositAmount: ethers.BigNumber.from('250'),
      },
    };

    expect(model.initialize(log)).toEqual({
      depositAmount: ethers.BigNumber.from('250'),
      id: '0x99eb9c116d2b390b8ee727c9045e4358bd98d71fc7cf20027c3453b8d94d1518',
      providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
      requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
      valid: true,
      walletIndex: ethers.BigNumber.from('2'),
    });
  });
});
