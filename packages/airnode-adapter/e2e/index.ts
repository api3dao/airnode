import { expect } from 'chai';
import { ethers } from 'hardhat';
import { goSync, go, assertGoError } from '@api3/promise-utils';
import { extractAndEncodeResponse, ResponseReservedParameters } from '../src';
import type { Contract } from 'ethers';

// Chai is able to assert that "expect(BigNumber).to.equal(string)" but fails to assert
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

  const goBigNumber = goSync(() => expect(ethers.BigNumber.from([123])).to.equal(['123']));
  assertGoError(goBigNumber);
  expect(goBigNumber.error.message).to.contain('invalid BigNumber value');

  assertArrayEquals([[ethers.BigNumber.from(123)], [ethers.BigNumber.from(456)]], [['123'], [456]]);
});

const apiResponse = {
  decimal: 123456789,
  float: 12345.6789,
  string: 'random string',
  // The string above encoded to UTF8 bytes
  bytes: '0x72616e646f6d20737472696e6700000000000000000000000000000000000000',
  big: {
    decimal: '11223344556677889900',
    // The maximum number that fits in int256
    largeDecimal: '57896044618658097711785492504343953926634992332820282019728792003956564819967',
    // A number that does not fit in int256 but fits in uint256
    tooLargeDecimal: '57896044618658097711785492504343953926634992332820282019728792003956564819968',
    float: '112233445566.778899',
    string: 'very large string that can NOT be encoded to bytes32',
    // The string above encoded to UTF8 bytes
    bytes: '0x76657279206c6172676520737472696e6720746861742063616e204e4f5420626520656e636f64656420746f2062797465733332',
    decimalNegative: '-11223344556677889900',
    floatNegative: '-112233445566.778899',
  },
  address: '0x0765baA22F6D4A53847D63B056DC79400b9A592a',
  addressWithoutPrefix: '0765baA22F6D4A53847D63B056DC79400b9A592a',
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

function extractAndEncode(reservedParams: ResponseReservedParameters) {
  const encoded = extractAndEncodeResponse(apiResponse, reservedParams);
  if (Array.isArray(encoded)) expect.fail();

  return encoded.encodedValue;
}

describe('Extraction, encoding and simple on chain decoding', () => {
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
          extractAndEncode({
            _type: type,
            _path: 'big.decimal',
          })
        )
      ).to.equal(apiResponse.big.decimal);

      expect(
        await testDecoder[methodName](
          extractAndEncode({
            _type: type,
            _path: 'decimal',
          })
        )
      ).to.equal(apiResponse.decimal);

      expect(
        await testDecoder[methodName](
          extractAndEncode({
            _type: type,
            _path: 'big.float',
            _times: '1000000',
          })
        )
      ).to.equal('112233445566778899');

      expect(
        await testDecoder[methodName](
          extractAndEncode({
            _type: type,
            _path: 'float',
            _times: '1000000',
          })
        )
      ).to.equal(ethers.BigNumber.from('12345678900'));

      expect(
        await testDecoder[methodName](
          extractAndEncode({
            _type: type,
            _path: 'big.largeDecimal',
          })
        )
      ).to.equal(apiResponse.big.largeDecimal);
    });
  });

  it('floors the number after multiplying it', async () => {
    expect(
      await testDecoder.decodeSignedInt256(extractAndEncode({ _type: 'int256', _times: '100', _path: 'float' }))
    ).to.equal(1234567);
  });

  it('decodes a large number as uint256', async () => {
    expect(
      await testDecoder.decodeUnsignedInt256(extractAndEncode({ _type: 'uint256', _path: 'big.tooLargeDecimal' }))
    ).to.equal(apiResponse.big.tooLargeDecimal);
  });

  it('floors the number without using "_times" parameter', async () => {
    expect(await testDecoder.decodeSignedInt256(extractAndEncode({ _type: 'int256', _path: 'float' }))).to.equal(12345);
  });

  it('decodes bool encoded by the adapter package', async () => {
    expect(await testDecoder.decodeBool(extractAndEncode({ _type: 'bool', _path: 'boolTrue' }))).to.equal(true);
    expect(await testDecoder.decodeBool(extractAndEncode({ _type: 'bool', _path: 'strFalse' }))).to.equal(false);
  });

  it('decodes bytes32 encoded by the adapter package', async () => {
    const encodedBytes = extractAndEncode({ _type: 'bytes32', _path: 'bytes' });

    const fromContract = await testDecoder.decodeBytes32(encodedBytes);
    const decoded = ethers.utils.parseBytes32String(fromContract);
    expect(decoded).to.equal(apiResponse.string);
  });

  it('decodes address encoded by the adapter package', async () => {
    expect(await testDecoder.decodeAddress(extractAndEncode({ _type: 'address', _path: 'address' }))).to.equal(
      apiResponse.address
    );

    expect(
      await testDecoder.decodeAddress(extractAndEncode({ _type: 'address', _path: 'addressWithoutPrefix' }))
      // NOTE: Notice that the response is with prefix '0x'
    ).to.equal(apiResponse.address);
  });

  it('decodes bytes encoded by the adapter package', async () => {
    const { toUtf8String, arrayify } = ethers.utils;
    const encodedBytes = extractAndEncode({ _type: 'bytes', _path: 'big.bytes' });

    const fromContract = await testDecoder.decodeBytes(encodedBytes);
    const decoded = toUtf8String(arrayify(fromContract)).toString();
    expect(decoded).to.equal(apiResponse.big.string);
  });

  it('decodes string encoded by the adapter package', async () => {
    expect(await testDecoder.decodeString(extractAndEncode({ _type: 'string', _path: 'big.string' }))).to.equal(
      apiResponse.big.string
    );
  });

  describe('decodes arrays', () => {
    it('1 dimension unlimited size', async () => {
      assertArrayEquals(
        await testDecoder.decode1DArray(extractAndEncode({ _type: 'int256[]', _path: 'array.int256' })),
        apiResponse.array.int256
      );
    });

    it('1 dimension fixed length', async () => {
      assertArrayEquals(
        await testDecoder.decode1DFixedArray(extractAndEncode({ _type: 'int256[2]', _path: 'array.int256' })),
        apiResponse.array.int256
      );
    });

    it('1 dimension fixed length with _times parameter', async () => {
      assertArrayEquals(
        await testDecoder.decode1DFixedArray(
          extractAndEncode({ _type: 'int256[2]', _path: 'array.int256', _times: '1000' })
        ),
        [123000, 456000]
      );
    });

    it('mixed fixes/unlimited sized arrays', async () => {
      // Solidity arrays are specified "backwards". See https://ethereum.stackexchange.com/a/129
      const encodedBytes = extractAndEncode({
        _type: 'int256[2][][3]',
        _path: 'array.nested',
      });

      const decoded = await testDecoder.decodeNestedArray(encodedBytes);
      assertArrayEquals(decoded, apiResponse.array.nested);
    });
  });

  it('decodes string32 encoded by the adapter package', async () => {
    const { parseBytes32String, arrayify } = ethers.utils;
    const encodedBytes = extractAndEncode({ _type: 'string32', _path: 'string' });

    const fromContract = await testDecoder.decodeString32(encodedBytes);
    const decoded = parseBytes32String(arrayify(fromContract)).toString();
    expect(decoded).to.equal(apiResponse.string);
  });

  it('decodes timestamp encoded by the adapter package', async () => {
    const nowSeconds = ethers.BigNumber.from(Math.floor(new Date().getTime() / 1000));
    const decoded = await testDecoder.decodeTimestamp(extractAndEncode({ _type: 'timestamp', _path: '' }));

    expect(nowSeconds.lte(decoded)).to.equal(true);
    const futureSeconds = nowSeconds.add(10 * 1000); // Add 10 seconds
    expect(futureSeconds.gte(decoded)).to.equal(true);
  });

  it('decodes multiple params encoded by the adapter package', async () => {
    const decoded = await testDecoder.decodeMultipleParameters(
      extractAndEncode({ _type: 'string,uint256,address', _path: 'big.string,float,address', _times: ',10000,' })
    );

    assertArrayEquals(decoded, [apiResponse.big.string, 123456789, apiResponse.address]);
  });

  it('tests escaping path', async () => {
    const decoded = await testDecoder.decodeMultipleParameters(
      extractAndEncode({
        _type: 'string,uint256,address',
        _path: 'json.strange\\.key,float,address',
        _times: ',10000,',
      })
    );

    assertArrayEquals(decoded, [apiResponse.json['strange.key'], 123456789, apiResponse.address]);
  });

  describe('Failures', () => {
    it('throws on invalid type', () => {
      // 'true' is not a valid _type, 'bool' should be used
      expect(() => extractAndEncode({ _type: 'true', _path: 'boolTrue' })).to.Throw('Invalid type: true');
    });

    it('throws when parsing fixed array as non fixed one', async () => {
      const goDecode1DArray = await go(() =>
        testDecoder.decode1DArray(extractAndEncode({ _type: 'int256[2]', _path: 'array.int256' }))
      );
      assertGoError(goDecode1DArray);
      expect(goDecode1DArray.error.message).to.contain('call revert exception');
    });

    it('throws on invalid path', () => {
      const dynamicKey = 'strange.key';

      expect(() => extractAndEncode({ _type: 'int256', _times: '100', _path: `json.${dynamicKey}` })).to.Throw(
        `Unable to find value at path: 'json.strange.key'`
      );
    });

    it('throws on int256 max number', async () => {
      const goExtractAndEncode = await go(() =>
        testDecoder['decodeSignedInt256'](
          extractAndEncode({
            _type: 'int256',
            _path: 'big.tooLargeDecimal',
          })
        )
      );
      assertGoError(goExtractAndEncode);
      expect(goExtractAndEncode.error.message).to.contain('out-of-bounds');
    });
  });
});
