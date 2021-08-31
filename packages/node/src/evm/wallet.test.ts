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

describe('getAirnodeWallet', () => {
  it('returns the airnode wallet', () => {
    const airnodeWallet = wallet.getAirnodeWallet(config);
    expect(airnodeWallet.address).toEqual('0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace');
  });
});

describe('getAirnodeAddressShort', () => {
  it('returns a shortened airnodeAddress', () => {
    const airnodeWallet = wallet.getAirnodeWallet(config);
    const res = wallet.getAirnodeAddressShort(airnodeWallet.address);
    expect(res).toEqual('A30CA71');
  });
});

describe('deriveSponsorWallet', () => {
  it('returns the wallet for the given sponsor', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const signingWallet = wallet.deriveSponsorWallet(masterHDNode, '0x06f509f73eefba36352bc8228f9112c3786100da');
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0x1492D895B7d597c645eB96D54f8F872d879BA7fE');
  });
});
