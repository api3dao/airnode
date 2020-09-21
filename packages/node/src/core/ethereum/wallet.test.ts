jest.mock('../config', () => ({
  security: {
    masterKeyMnemonic: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  },
}));

import { ethers } from 'ethers';
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
    const adminWallet = wallet.deriveWalletAddressFromIndex(xpub, '0');
    const wallet1 = wallet.deriveWalletAddressFromIndex(xpub, '1');
    const wallet2 = wallet.deriveWalletAddressFromIndex(xpub, '777');
    expect(adminWallet).toEqual('0x566954B6E04BDb789e7d1118e3dC1AC9A34A8B44');
    expect(wallet1).toEqual('0xBff368EaD703f07fC6C9585e25d9755A47361562');
    expect(wallet2).toEqual('0x36c6c96d0ce55c37613a8acA1D895B923C557FA4');
  });
});

describe('deriveSigningWalletFromIndex', () => {
  it('returns the signer for the given index', () => {
    const provider = new ethers.providers.JsonRpcProvider();
    const signingWallet = wallet.deriveSigningWalletFromIndex(provider, '0');
    expect(signingWallet.provider).toEqual(provider);
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0x566954B6E04BDb789e7d1118e3dC1AC9A34A8B44');
  });
});

describe('isAdminWalletIndex', () => {
  it('returns true if the index is reserved by the admin', () => {
    expect(wallet.isAdminWalletIndex('0')).toEqual(true);
  });

  it('returns false if the index is not reserved', () => {
    expect(wallet.isAdminWalletIndex('1')).toEqual(false);
  });
});
