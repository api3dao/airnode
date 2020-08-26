import * as model from './model';
import { RequestStatus } from 'src/types';

describe('initialize Withdrawal ClientRequest', () => {
  it('initializes a new Withdrawal request', () => {
    const logWithMetadata: any = {
      parsedLog: {
        args: {
          providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
          requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
          destination: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
          withdrawalRequestId: '0xea425b2e05d25bbcfa2e9ea76c247e20f37d9dc3c0f50bd28b2bf19676f790e8',
        },
      },
      blockNumber: 10716082,
      transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
    };


    expect(model.initialize(logWithMetadata)).toEqual({
      destinationAddress: '0xc3eb02c57654b57e06a745a970317987f7886c000e95a4a51d4a4447c515cc05',
      id: '0xea425b2e05d25bbcfa2e9ea76c247e20f37d9dc3c0f50bd28b2bf19676f790e8',
      logMetadata: {
        blockNumber: 10716082,
        transactionHash: '0x61c972d98485da38115a5730b6741ffc4f3e09ae5e1df39a7ff18a68777ab318',
      },
      providerId: '0x2f800fb1026b0f3fc324ae5d559075d96608f978f80d9419a55a93a84a3500a1',
      requesterId: '0xaafaf90b0dd28800d2d3ade24c60b0c798b83c082f6dd1cca7aaf1b319dbd533',
      status: RequestStatus.Pending,
    });
  });
});
