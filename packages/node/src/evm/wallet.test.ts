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

describe('getAirnodeAddressShort', () => {
  it('returns a shortened airnodeAddress', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const res = wallet.getAirnodeAddressShort(masterHDNode.address);
    expect(res).toEqual('2886De6');
  });
});

describe('deriveSponsorWalletAddress', () => {
  it('returns the wallet address for the given sponsor', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const adminWallet = wallet.deriveSponsorWalletAddress(masterHDNode, '0x06f509f73eefba36352bc8228f9112c3786100da');
    const wallet1 = wallet.deriveSponsorWalletAddress(masterHDNode, '0x35cbd98014d4c3825d8486993b9944c7be56f763');
    const wallet2 = wallet.deriveSponsorWalletAddress(masterHDNode, '0x4cff48a294272a0449d9163e92e6c93ba0cd90b5');
    expect(adminWallet).toEqual('0x1492D895B7d597c645eB96D54f8F872d879BA7fE');
    expect(wallet1).toEqual('0x62D1032E618d3262163e54E510566b294B0837AA');
    expect(wallet2).toEqual('0xE0d2Bd4aEE852cd0238bBfc3D09F6a67204523B5');
  });
});

describe('deriveSponsorWallet', () => {
  it('returns the wallet for the given sponsor', () => {
    const masterHDNode = wallet.getMasterHDNode();
    const signingWallet = wallet.deriveSponsorWallet(masterHDNode, '0x06f509f73eefba36352bc8228f9112c3786100da');
    expect(signingWallet._isSigner).toEqual(true);
    expect(signingWallet.address).toEqual('0x1492D895B7d597c645eB96D54f8F872d879BA7fE');
  });
});
