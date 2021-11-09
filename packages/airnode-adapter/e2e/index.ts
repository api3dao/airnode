import { expect } from 'chai';
import { ethers } from 'hardhat';
import { extractAndEncodeResponse } from '../src';
import type { Contract } from 'ethers';

// Chai is able to assert that "expect(BigNumber).to.equal(string)"" but fails to assert
// the values if wrapped in array "expect(BigNumber[]).to.equal(string[])"
function assertArrayEquals<T = unknown>(actual: T, expected: T) {
  if (!Array.isArray(actual)) {
    expect(actual).to.equal(expected);
    return;
  }

  // eslint-disable-next-line
  for (let i = 0; i < actual.length; i++) {
    assertArrayEquals(actual[i], (expected as any)[i]);
  }
}

it('shows the need for assertArrayEquals', () => {
  expect(ethers.BigNumber.from(123)).to.equal(123);
  expect(ethers.BigNumber.from(123)).to.equal('123');

  // eslint-disable-next-line functional/no-try-statement
  try {
    expect(ethers.BigNumber.from([123])).to.equal(['123']);
    expect.fail();
    // eslint-disable-next-line no-empty
  } catch {}

  assertArrayEquals([[ethers.BigNumber.from(123)], [ethers.BigNumber.from(456)]], [['123'], [456]]);
});

const apiResponse = {
  decimal: 123456789,
  float: 12345.6789,
  string: 'random string',
  big: {
    decimal: '11223344556677889900',
    float: '112233445566.778899',
    string: 'very large string that can NOT be encoded to bytes32',
    decimalNegative: '-11223344556677889900',
    floatNegative: '-112233445566.778899',
  },
  address: '0x0765baA22F6D4A53847D63B056DC79400b9A592a',
  boolTrue: true,
  strFalse: false,
  json: {
    a: true,
    b: 123,
    ['strange.key']: 'abc',
  },
  nullType: null,
  array: {
    int256: ['123', '456'],
    nested: [
      [['30', '40']],
      [['10', '20']],
      [
        ['1', '2'],
        ['3', '4'],
      ],
    ],
  },
} as const;

describe('Extraction, encoding and simple on chain decoding', () => {
  // eslint-disable-next-line functional/no-let
  let testDecoder: Contract;

  before(async () => {
    const TestDecoder = await ethers.getContractFactory('TestDecoder');
    testDecoder = await TestDecoder.deploy();
    await testDecoder.deployed();
  });

  ['int256', 'uint256'].forEach((type) => {
    it(`decodes ${type} encoded by the adapter package`, async () => {
      const methodName = type === 'int256' ? 'decodeSignedInt256' : 'decodeUnsignedInt256';

      expect(
        await testDecoder[methodName](
          extractAndEncodeResponse(apiResponse, {
            _type: type,
            _path: 'big.decimal',
          }).encodedValue
        )
      ).to.equal(apiResponse.big.decimal);

      expect(
        await testDecoder[methodName](
          extractAndEncodeResponse(apiResponse, {
            _type: type,
            _path: 'decimal',
          }).encodedValue
        )
      ).to.equal(apiResponse.decimal);

      expect(
        await testDecoder[methodName](
          extractAndEncodeResponse(apiResponse, {
            _type: type,
            _path: 'decimal',
          }).encodedValue
        )
      ).to.equal(apiResponse.decimal);

      expect(
        await testDecoder[methodName](
          extractAndEncodeResponse(apiResponse, {
            _type: type,
            _path: 'decimal',
          }).encodedValue
        )
      ).to.equal(apiResponse.decimal);

      expect(
        await testDecoder[methodName](
          extractAndEncodeResponse(apiResponse, {
            _type: type,
            _path: 'float',
            _times: '1000000',
          }).encodedValue
        )
      ).to.equal(ethers.BigNumber.from('12345678900'));
    });
  });

  it('decodes bool encoded by the adapter package', async () => {
    expect(
      await testDecoder.decodeBool(
        extractAndEncodeResponse(apiResponse, { _type: 'bool', _path: 'boolTrue' }).encodedValue
      )
    ).to.equal(true);
    expect(
      await testDecoder.decodeBool(
        extractAndEncodeResponse(apiResponse, { _type: 'bool', _path: 'strFalse' }).encodedValue
      )
    ).to.equal(false);
  });

  it('decodes bytes32 encoded by the adapter package', async () => {
    const encodedBytes = extractAndEncodeResponse(apiResponse, { _type: 'bytes32', _path: 'string' }).encodedValue;

    expect(await testDecoder.decodeBytes32(encodedBytes)).to.equal(encodedBytes);
    expect(ethers.utils.parseBytes32String(encodedBytes)).to.equal(apiResponse.string);
  });

  it('decodes address encoded by the adapter package', async () => {
    expect(
      await testDecoder.decodeAddress(
        extractAndEncodeResponse(apiResponse, { _type: 'address', _path: 'address' }).encodedValue
      )
    ).to.equal(apiResponse.address);
  });

  it('decodes bytes encoded by the adapter package', async () => {
    const { hexlify, toUtf8Bytes, toUtf8String, arrayify } = ethers.utils;
    const bytesString = hexlify(toUtf8Bytes(apiResponse.big.string));
    const encodedBytes = extractAndEncodeResponse(bytesString, { _type: 'bytes' }).encodedValue;

    const fromContract = await testDecoder.decodeBytes(encodedBytes);
    const decoded = toUtf8String(arrayify(fromContract)).toString();
    expect(decoded).to.equal(apiResponse.big.string);
  });

  it('decodes string encoded by the adapter package', async () => {
    expect(
      await testDecoder.decodeString(
        extractAndEncodeResponse(apiResponse, { _type: 'string', _path: 'big.string' }).encodedValue
      )
    ).to.equal(apiResponse.big.string);
  });

  describe('decodes arrays', () => {
    it('1 dimension unlimited size', async () => {
      assertArrayEquals(
        await testDecoder.decode1DArray(
          extractAndEncodeResponse(apiResponse, { _type: 'int256[]', _path: 'array.int256' }).encodedValue
        ),
        apiResponse.array.int256
      );
    });

    it('1 dimension fixed length', async () => {
      assertArrayEquals(
        await testDecoder.decode1DArray(
          extractAndEncodeResponse(apiResponse, { _type: 'int256[2]', _path: 'array.int256' }).encodedValue
        ),
        apiResponse.array.int256
      );
    });

    it('mixed fixes/unlimited sized arrays', async () => {
      // Solidity arrays are specified "backwards". See https://ethereum.stackexchange.com/a/129
      const encodedBytes = extractAndEncodeResponse(apiResponse, {
        _type: 'int256[2][][3]',
        _path: 'array.nested',
      }).encodedValue;

      const decoded = await testDecoder.decodeNestedArray(encodedBytes);
      assertArrayEquals(decoded, apiResponse.array.nested);
    });
  });
});

describe('Failures', () => {
  it('throws on invalid type', () => {
    // 'true' is not a valid _type, 'bool' should be used
    expect(() => extractAndEncodeResponse(apiResponse.boolTrue, { _type: 'true' }).encodedValue).to.Throw(
      'Invalid type: true'
    );
  });

  // TODO: _times not big enough
  // TODO: strange.key test
});
