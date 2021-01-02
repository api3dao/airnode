import { ethers } from 'ethers';
import { fetchPendingRequests } from './fetch-pending-requests';
import * as fixtures from 'test/fixtures';

describe('fetchPendingRequests', () => {
  it('fetches and returns requests', async () => {
    const newApiCallEvent = {
      blockNumber: 10716082,
      topic: '0xaff6f5e5548953a11cbb1cfdd76562512f969b0eba0a2163f2420630d4dda97b',
      transactionHash: '0x1',
    };
    const fulfilledApiCallEvent = {
      blockNumber: 10716083,
      topic: '0x1bdbe9e5d42a025a741fc3582eb3cad4ef61ac742d83cc87e545fbd481b926b5',
      transactionHash: '0x2',
    };
    const unknownEvent = {
      blockNumber: 10716082,
      topic: '0xa3c071367f90badae4981bd81d1e0a407fe9ad80e35d4c95ffdd4e4f7850280b',
      transactionHash: '0x3',
    };

    const getLogs = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getLogs') as any;
    getLogs.mockResolvedValueOnce([newApiCallEvent, fulfilledApiCallEvent, unknownEvent]);

    const state = fixtures.buildEVMProviderState();
    const res = await fetchPendingRequests(state);
    expect(res).toEqual(state);
  });
});
