jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import * as wallet from './wallet';

describe('getExtendedPublicKey', () => {
  it('returns the extended public key for the master mnemonic', () => {
    const xpub = wallet.getExtendedPublicKey();
    expect(xpub).toEqual(
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx'
    );
  });
});

describe('deriveWalletFromIndex', () => {
  it('returns the wallet address for the given index', () => {
    const xpub = wallet.getExtendedPublicKey();
    const wallet1 = wallet.deriveWalletAddressFromIndex(xpub, 1);
    const wallet2 = wallet.deriveWalletAddressFromIndex(xpub, 777);
    expect(wallet1).toEqual('0xBff368EaD703f07fC6C9585e25d9755A47361562');
    expect(wallet2).toEqual('0x36c6c96d0ce55c37613a8acA1D895B923C557FA4');
  });
});
