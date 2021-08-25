import * as wallet from './wallet';
import * as fixtures from '../../test/fixtures';

const config = fixtures.buildConfig();

describe('getExtendedPublicKey', () => {
  it('returns the extended public key for the master HDNode', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const xpub = wallet.getExtendedPublicKey(masterHDNode);
    expect(xpub).toEqual(
      'xpub661MyMwAqRbcGeCE1g3KTUVGZsFDE3jMNinRPGCQGQsAp1nwinB9Pi16ihKPJw7qtaaTFuBHbRPeSc6w3AcMjxiHkAPfyp1hqQRbthv4Ryx'
    );
  });
});

describe('getWallet', () => {
  it('returns the wallet for the given private key', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const masterWallet = wallet.getWallet(masterHDNode.privateKey);
    expect(masterWallet.address).toEqual('0x2886De6bbd66DB353C5Ce2e91359e7C39C962fd7');
  });
});

describe('getAirnodeAddressShort', () => {
  it('returns a shortened airnodeAddress', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const res = wallet.getAirnodeAddressShort(masterHDNode.address);
    expect(res).toEqual('19255a4e');
  });
});

describe('deriveSponsorWalletAddress', () => {
  it('returns the wallet address for the given sponsor', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const adminWallet = wallet.deriveSponsorWalletAddress(masterHDNode, '0'); //TODO: fix value
    const wallet1 = wallet.deriveSponsorWalletAddress(masterHDNode, '1'); //TODO: fix value
    const wallet2 = wallet.deriveSponsorWalletAddress(masterHDNode, '777'); //TODO: fix value
    expect(adminWallet).toEqual('0xF47dD64127f46ca44679647BC1B3c6B248bf79A0');
    expect(wallet1).toEqual('0x34e9A78D63c9ca2148C95e880c6B1F48AE7F121E');
    expect(wallet2).toEqual('0x5547c2B0420D120f1DE7767c9BE451705df5a4E5');
  });
});

describe('deriveSponsorWallet', () => {
  it('returns the wallet for the given sponsor', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const signingWallet = wallet.deriveSponsorWallet(masterHDNode, '0'); //TODO: fix value
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0xF47dD64127f46ca44679647BC1B3c6B248bf79A0');
  });
});
