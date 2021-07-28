import { ethers } from 'ethers';
import { deriveWalletPathFromAddress } from './implementation';

describe('deriveWalletPathFromAddress', () => {
  it('converts address to derivation path', () => {
    const address = '0x8A45eac0267dD0803Fd957723EdE10693A076698';
    const res = deriveWalletPathFromAddress(address);
    expect(res).toEqual('m/0/973563544/2109481170/2137349576/871269377/610184194/17');

    const randomAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
    const randomPath = deriveWalletPathFromAddress(randomAddress);
    expect(res).not.toEqual(randomPath);
  });
  it('converts zero address to derivation path', () => {
    const address = ethers.constants.AddressZero;
    const res = deriveWalletPathFromAddress(address);
    expect(res).toEqual('m/0/0/0/0/0/0/0');
  });
  it('throws if address is null', () => {
    const address = null;
    expect(() => deriveWalletPathFromAddress(address!)).toThrow('invalid address');
  });
  it('throws if address is undefined', () => {
    const address = undefined;
    expect(() => deriveWalletPathFromAddress(address!)).toThrow('invalid address');
  });
  it('throws if address is an empty string', () => {
    const address = '';
    expect(() => deriveWalletPathFromAddress(address)).toThrow('invalid address');
  });
  it('throws if address is invalid', () => {
    let address = '7dD0803Fd957723EdE10693A076698';
    expect(() => deriveWalletPathFromAddress(address)).toThrow('invalid address');

    address = ethers.utils.hexlify(ethers.utils.randomBytes(4));
    expect(() => deriveWalletPathFromAddress(address)).toThrow('invalid address');

    address = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    expect(() => deriveWalletPathFromAddress(address)).toThrow('invalid address');
  });
});
