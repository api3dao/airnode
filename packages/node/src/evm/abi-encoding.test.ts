import { ethers } from 'ethers';
import { safeDecode } from './abi-encoding';

describe('safeDecode', () => {
  it('decodes parameters successfully', () => {
    const res = safeDecode(
      '0x315375000000000000000000000000000000000000000000000000000000000066726f6d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0616d6f756e74000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000034554480000000000000000000000000000000000000000000000000000000000'
    );
    expect(res).toEqual({
      from: 'ETH',
      amount: '1000',
    });
  });

  it('returns empty parameters if data is empty', () => {
    const res = safeDecode('0x');
    expect(res).toEqual({});
  });

  it('returns null for AddressZero', () => {
    const res = safeDecode(ethers.constants.AddressZero);
    expect(res).toEqual(null);
  });

  it('returns null for HashZero', () => {
    const res = safeDecode(ethers.constants.HashZero);
    expect(res).toEqual(null);
  });

  it('returns null for empty strings', () => {
    const res = safeDecode('');
    expect(res).toEqual(null);
  });

  it('returns null if the parameters cannot be decoded', () => {
    const res = safeDecode('1234');
    expect(res).toEqual(null);
  });
});
