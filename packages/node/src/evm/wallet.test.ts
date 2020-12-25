import * as wallet from './wallet';

describe('getExtendedPublicKey', () => {
  it('returns the extended public key for the master HDNode', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const xpub = wallet.getExtendedPublicKey(masterHDNode);
    expect(xpub).toEqual(
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx'
    );
  });
});

describe('getWallet', () => {
  it('returns the wallet for the given private key', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const masterWallet = wallet.getWallet(masterHDNode.privateKey);
    expect(masterWallet.address).toEqual('0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7');
  });
});

describe('getProviderId', () => {
  it('returns the providerId from the mnemonic', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const res = wallet.getProviderId(masterHDNode);
    expect(res).toEqual('0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb');
  });
});

describe('deriveWalletAddressFromIndex', () => {
  it('returns the wallet address for the given index', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const adminWallet = wallet.deriveWalletAddressFromIndex(masterHDNode, '0');
    const wallet1 = wallet.deriveWalletAddressFromIndex(masterHDNode, '1');
    const wallet2 = wallet.deriveWalletAddressFromIndex(masterHDNode, '777');
    expect(adminWallet).toEqual('0xF47dD64127f46ca44679647BC1B3c6B248bf79A0');
    expect(wallet1).toEqual('0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E');
    expect(wallet2).toEqual('0x5547c2B0420D120f1DE7767c9BE451705df5a4E5');
  });
});

describe('deriveSigningWalletFromIndex', () => {
  it('returns the signer for the given index', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const signingWallet = wallet.deriveSigningWalletFromIndex(masterHDNode, '0');
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0xF47dD64127f46ca44679647BC1B3c6B248bf79A0');
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
