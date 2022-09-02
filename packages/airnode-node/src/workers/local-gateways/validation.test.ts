import { readFileSync } from 'fs';
import { join } from 'path';
import { Config } from '@api3/airnode-node';
import {
  verifyHttpRequest,
  verifyHttpSignedDataRequest,
  checkRequestOrigin,
  verifyRequestOrigin,
  buildCorsHeaders,
} from './validation';

const loadConfigFixture = (): Config =>
  // We type the result as "Config", however it will not pass validation in it's current state because the secrets are
  // not interpolated
  JSON.parse(readFileSync(join(__dirname, '../../../test/fixtures/config/config.valid.json')).toString());

const validEndpointId = '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4';

describe('verifyHttpRequest', () => {
  it('returns error when the endpoint ID is not found', () => {
    const config = loadConfigFixture();
    const nonExistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';

    const result = verifyHttpRequest(config, { coinId: 'bitcoin' }, nonExistentEndpointId);

    expect(result).toEqual({
      error: {
        message: "Unable to find endpoint with ID:'0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff'",
      },
      statusCode: 400,
      success: false,
    });
  });

  it('returns error when the parameters are invalid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpRequest(config, { nonStringValue: 123 }, validEndpointId);

    expect(result).toEqual({
      error: { message: 'Invalid request body' },
      statusCode: 400,
      success: false,
    });
  });

  it('returns success when the data is valid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpRequest(config, { coinId: 'bitcoin' }, validEndpointId);

    expect(result).toEqual({
      success: true,
      endpointId: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4',
      parameters: {
        coinId: 'bitcoin',
      },
    });
  });
});

describe('verifyHttpSignedDataRequest', () => {
  it('returns error when the endpoint ID is not found', () => {
    const config = loadConfigFixture();
    const nonExistentEndpointId = '0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff';

    const result = verifyHttpSignedDataRequest(
      config,
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
      nonExistentEndpointId
    );

    expect(result).toEqual({
      error: {
        message: "Unable to find endpoint with ID:'0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc931ffff'",
      },
      statusCode: 400,
      success: false,
    });
  });

  it('returns error when the encoded parameters are invalid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpSignedDataRequest(config, '0x-Clearly-Invalid', validEndpointId);

    expect(result).toEqual({
      error: { message: 'Request contains invalid encodedParameters: 0x-Clearly-Invalid' },
      statusCode: 400,
      success: false,
    });
  });

  it('returns success when the data is valid', () => {
    const config = loadConfigFixture();

    const result = verifyHttpSignedDataRequest(
      config,
      '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
      validEndpointId
    );

    expect(result).toEqual({
      success: true,
      encodedParameters:
        '0x3173000000000000000000000000000000000000000000000000000000000000636f696e49640000000000000000000000000000000000000000000000000000626974636f696e00000000000000000000000000000000000000000000000000',
      endpointId: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d400ac2eccdbef8d6143e78c4',
    });
  });
});

describe('cors', () => {
  const origin = 'https://origin.com';
  const notAllowedOrigin = 'https://notallowed.com';
  const allAllowedOrigin = '*';

  describe('buildCorsHeaders', () => {
    it('returns headers with input origin', () => {
      const headers = buildCorsHeaders(origin);
      expect(headers).toEqual({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
    });
  });

  describe('checkRequestOrigin', () => {
    it('returns allowed origin', () => {
      const allowedOrigin = checkRequestOrigin([origin], origin);
      expect(allowedOrigin).toEqual(origin);
    });

    it('returns allow all origins', () => {
      const allowedOrigin = checkRequestOrigin([allAllowedOrigin], origin);
      expect(allowedOrigin).toEqual(allAllowedOrigin);
    });

    it('returns undefined if no allowed origin match', () => {
      const allowedOrigin = checkRequestOrigin([origin], notAllowedOrigin);
      expect(allowedOrigin).toBeUndefined();
    });

    it('returns undefined if empty allowedOrigins', () => {
      const allowedOrigin = checkRequestOrigin([], notAllowedOrigin);
      expect(allowedOrigin).toBeUndefined();
    });
  });

  describe('verifyRequestOrigin', () => {
    it('handles disabling cors', () => {
      const originVerification = verifyRequestOrigin([], notAllowedOrigin);
      expect(originVerification).toEqual({ success: false, error: { message: 'CORS origin verification failed.' } });
    });
    it('handles allow all origins', () => {
      const originVerification = verifyRequestOrigin([allAllowedOrigin], notAllowedOrigin);
      expect(originVerification).toEqual({ success: true, headers: buildCorsHeaders(allAllowedOrigin) });
    });

    it('handles allowed origin', () => {
      const originVerification = verifyRequestOrigin([origin], origin);
      expect(originVerification).toEqual({ success: true, headers: buildCorsHeaders(origin) });
    });
  });
});
