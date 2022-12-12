import * as wallet from './wallet';
import * as fixtures from '../../test/fixtures';
import { getMasterKeyMnemonic } from '../config';

const config = fixtures.buildConfig();

describe('getExtendedPublicKey', () => {
  it('returns the extended public key for the master HDNode', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const xpub = wallet.getExtendedPublicKey(masterHDNode);
    expect(xpub).toEqual(
      'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY'
    );
  });
});

describe('getAirnodeWallet', () => {
  it('returns the airnode wallet', () => {
    const airnodeWallet = wallet.getAirnodeWallet(config);
    expect(airnodeWallet.address).toEqual('0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace');
  });
});

describe('deriveSponsorWallet', () => {
  it('returns the wallet for the given sponsor', () => {
    const masterHDNode = wallet.getMasterHDNode(config);
    const signingWallet = wallet.deriveSponsorWallet(masterHDNode, '0x06f509f73eefba36352bc8228f9112c3786100da');
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0x228A54F33E46fbb32a62ca650Fcc9eD3C730511d');
  });
});

describe('deriveSponsorWalletFromMnemonic', () => {
  it('returns the wallet for the given sponsor (will use default protocolId = 1)', () => {
    const mnemonic = getMasterKeyMnemonic(config);
    const signingWallet = wallet.deriveSponsorWalletFromMnemonic(
      mnemonic,
      '0x06f509f73eefba36352bc8228f9112c3786100da'
    );
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0x228A54F33E46fbb32a62ca650Fcc9eD3C730511d');
  });

  it('returns the wallet for the given sponsor and protocolId', () => {
    const mnemonic = getMasterKeyMnemonic(config);
    const signingWallet = wallet.deriveSponsorWalletFromMnemonic(
      mnemonic,
      '0x06f509f73eefba36352bc8228f9112c3786100da',
      '2'
    );
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0x9F3c41801c55a557ddCEdd25E29bA05780f31c37');
  });
});
