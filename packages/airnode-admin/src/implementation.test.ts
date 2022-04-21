import { ethers } from 'ethers';
import { deriveWalletPathFromSponsorAddress, generateMnemonic, parseCliOverrides } from './implementation';

describe('deriveWalletPathFromSponsorAddress', () => {
  it('converts address to derivation path', () => {
    const sponsorAddress = '0x8A45eac0267dD0803Fd957723EdE10693A076698';
    const res = deriveWalletPathFromSponsorAddress(sponsorAddress);
    expect(res).toEqual('1/973563544/2109481170/2137349576/871269377/610184194/17');

    const randomAddress = ethers.utils.getAddress(ethers.utils.hexlify(ethers.utils.randomBytes(20)));
    const randomPath = deriveWalletPathFromSponsorAddress(randomAddress);
    expect(res).not.toEqual(randomPath);
  });

  it('converts zero address to derivation path', () => {
    const sponsorAddress = ethers.constants.AddressZero;
    const res = deriveWalletPathFromSponsorAddress(sponsorAddress);
    expect(res).toEqual('1/0/0/0/0/0/0');
  });

  it('throws if address is null', () => {
    const sponsorAddress = null;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress!)).toThrow('invalid address');
  });

  it('throws if address is undefined', () => {
    const sponsorAddress = undefined;
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress!)).toThrow('invalid address');
  });

  it('throws if address is an empty string', () => {
    const sponsorAddress = '';
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow('invalid address');
  });

  it('throws if address is invalid', () => {
    let sponsorAddress = '7dD0803Fd957723EdE10693A076698';
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow('invalid address');

    sponsorAddress = ethers.utils.hexlify(ethers.utils.randomBytes(4));
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow('invalid address');

    sponsorAddress = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    expect(() => deriveWalletPathFromSponsorAddress(sponsorAddress)).toThrow('invalid address');
  });
});

describe('generate mnemonic', () => {
  it('generates different mnemonics', async () => {
    const mnemonic1 = await generateMnemonic();
    const mnemonic2 = await generateMnemonic();

    expect(mnemonic1).not.toBe(mnemonic2);
  });

  it('generates a valid mnemonic', async () => {
    const mnemonic = await generateMnemonic();

    expect(ethers.utils.isValidMnemonic(mnemonic)).toBe(true);
  });

  describe('parse transaction overrides', () => {
    it('parses legacy transaction overrides', () => {
      const overrides = parseCliOverrides({ 'gas-price': '10', 'gas-limit': '200000' } as any);

      expect(overrides).toEqual({
        gasPrice: ethers.utils.parseUnits('10', 'gwei'),
        gasLimit: ethers.BigNumber.from('200000'),
      });
    });

    it('parses EIP-1559 transaction overrides', () => {
      const overrides = parseCliOverrides({
        'max-fee': '20',
        'max-priority-fee': '10',
        'gas-limit': '200000',
      } as any);

      expect(overrides).toEqual({
        maxFeePerGas: ethers.utils.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('10', 'gwei'),
        gasLimit: ethers.BigNumber.from('200000'),
      });
    });

    it('parses payable (value) transaction override', () => {
      const overrides = parseCliOverrides({
        'gas-price': '10',
        'gas-limit': '200000',
        nonce: '6',
      } as any);

      expect(overrides).toEqual({
        gasPrice: ethers.utils.parseUnits('10', 'gwei'),
        gasLimit: ethers.BigNumber.from('200000'),
        nonce: 6,
      });
    });
  });
});
