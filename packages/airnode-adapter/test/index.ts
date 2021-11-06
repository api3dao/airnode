import { expect } from 'chai';
import { ethers } from 'hardhat';
import { encodeValue } from '../src';
import type { Contract } from 'ethers';

describe('TestDecoder', () => {
  // eslint-disable-next-line functional/no-let
  let testDecoder: Contract;

  before(async () => {
    const TestDecoder = await ethers.getContractFactory('TestDecoder');
    testDecoder = await TestDecoder.deploy();
    await testDecoder.deployed();
  });

  it('decodes int256 encoded by the adapter package', async () => {
    const int256 = '11223344556677889900';
    const bytes = encodeValue(int256, 'int256');

    expect(await testDecoder.decodeSignedInt256(bytes)).to.equal(int256);
  });

  it('decodes uint256 encoded by the adapter package', async () => {
    const uint256 = '11223344556677889900';
    const bytes = encodeValue(uint256, 'uint256');

    expect(await testDecoder.decodeUnsignedInt256(bytes)).to.equal(uint256);
  });

  it('decodes bool encoded by the adapter package', async () => {
    const encodedTrue = encodeValue(true, 'bool');
    const encodedFalse = encodeValue(false, 'bool');

    expect(await testDecoder.decodeBool(encodedTrue)).to.equal(true);
    expect(await testDecoder.decodeBool(encodedFalse)).to.equal(false);
  });

  it('decodes bytes32 encoded by the adapter package', async () => {
    const convertedBytes32 = 'some short string';
    const bytes = encodeValue(convertedBytes32, 'bytes32');

    expect(await testDecoder.decodeBytes32(bytes)).to.equal(bytes);
  });

  it('decodes address encoded by the adapter package', async () => {
    const address = '0x0765baA22F6D4A53847D63B056DC79400b9A592a';
    const bytes = encodeValue(address, 'address');

    expect(await testDecoder.decodeAddress(bytes)).to.equal(address);
  });

  it('decodes bytes encoded by the adapter package', async () => {
    const { hexlify, toUtf8Bytes, toUtf8String, arrayify } = ethers.utils;
    const exampleString = 'this is an example string that is a bit longer';
    const bytesString = hexlify(toUtf8Bytes(exampleString));
    const bytes = encodeValue(bytesString, 'bytes');

    const fromContract = await testDecoder.decodeBytes(bytes);
    expect(fromContract).to.equal(
      '0x7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572'
    );
    expect(bytes).to.equal(
      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002e7468697320697320616e206578616d706c6520737472696e672074686174206973206120626974206c6f6e676572000000000000000000000000000000000000'
    );

    const decoded = toUtf8String(arrayify(fromContract)).toString();
    expect(decoded).to.equal(exampleString);
  });

  it('decodes string encoded by the adapter package', async () => {
    const string = 'an example string that is to be encoded';
    const bytes = encodeValue(string, 'string');

    expect(await testDecoder.decodeString(bytes)).to.equal(string);
  });
});
