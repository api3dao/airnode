const executeMock = jest.fn();
jest.mock('@api3/airnode-adapter', () => ({
  execute: executeMock,
}));

import { ethers } from 'ethers';
import { randomHexString } from '@api3/airnode-utilities';
import cloneDeep from 'lodash/cloneDeep';
import * as heartbeat from './heartbeat';
import * as coordinatorState from '../coordinator/state';
import * as fixtures from '../../test/fixtures';
import { Config } from '../config';
import { HEARTBEAT_SALT } from '../../src/constants';

describe('reportHeartbeat', () => {
  const httpGatewayUrl = 'https://some.http.gateway.url/v1/';
  const httpSignedDataGatewayUrl = 'https://some.http.signed.data.gateway.url/v1/';
  fixtures.setEnvVariables({
    HTTP_GATEWAY_URL: httpGatewayUrl,
    HTTP_SIGNED_DATA_GATEWAY_URL: httpSignedDataGatewayUrl,
    AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey(),
  });

  it('does nothing if the heartbeat is disabled', async () => {
    const nodeSettings = fixtures.buildNodeSettings({ heartbeat: { enabled: false } });
    const config = fixtures.buildConfig({ nodeSettings });
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);
    const res = await heartbeat.reportHeartbeat(state);
    expect(res).toEqual([{ level: 'INFO', message: `Not sending heartbeat as 'nodeSettings.heartbeat' is disabled` }]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('handles heartbeat errors', async () => {
    executeMock.mockRejectedValueOnce(new Error('Server is down'));
    const config = fixtures.buildConfig();
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);
    const heartbeatPayload = {
      http_gateway_url: 'http://localhost:3000/http-data',
      http_signed_data_gateway_url: 'http://localhost:3000/http-signed-data',
    };
    const signature = await heartbeat.signHeartbeat(heartbeatPayload);
    const res = await heartbeat.reportHeartbeat(state);
    expect(res).toEqual([
      { level: 'INFO', message: 'Sending heartbeat...' },
      { level: 'ERROR', message: 'Failed to send heartbeat', error: new Error('Server is down') },
    ]);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({
      url: 'https://example.com',
      method: 'post',
      headers: {
        'airnode-heartbeat-api-key': '3a7af83f-6450-46d3-9937-5f9773ce2849',
      },
      data: {
        ...heartbeatPayload,
        signature,
      },
      timeout: 5_000,
    });
  });

  it('sends the heartbeat successfully', async () => {
    executeMock.mockResolvedValueOnce({ received: true });
    const config = fixtures.buildConfig();
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);
    const heartbeatPayload = {
      http_gateway_url: 'http://localhost:3000/http-data',
      http_signed_data_gateway_url: 'http://localhost:3000/http-signed-data',
    };
    const signature = await heartbeat.signHeartbeat(heartbeatPayload);
    const logs = await heartbeat.reportHeartbeat(state);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Sending heartbeat...' },
      { level: 'INFO', message: 'Heartbeat sent successfully' },
    ]);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({
      url: 'https://example.com',
      method: 'post',
      headers: {
        'airnode-heartbeat-api-key': '3a7af83f-6450-46d3-9937-5f9773ce2849',
      },
      data: {
        ...heartbeatPayload,
        signature,
      },
      timeout: 5_000,
    });
  });

  describe('getHttpGatewayUrl', () => {
    it('returns correct local gateway URL', () => {
      const mockedConfig = {
        nodeSettings: { cloudProvider: { type: 'local', gatewayServerPort: 8765 } },
      } as unknown as Config;

      expect(heartbeat.getHttpGatewayUrl(mockedConfig)).toEqual('http://localhost:8765/http-data');
    });

    it('returns correct serverless gateway URL', () => {
      const mockedConfig = {
        nodeSettings: { cloudProvider: { type: 'aws', region: 'us-east1', disableConcurrencyReservations: false } },
      } as unknown as Config;

      expect(heartbeat.getHttpGatewayUrl(mockedConfig)).toEqual(httpGatewayUrl);
    });
  });

  describe('getHttpSignedDataGatewayUrl', () => {
    it('returns correct local gateway URL', () => {
      const mockedConfig = {
        nodeSettings: { cloudProvider: { type: 'local', gatewayServerPort: 8765 } },
      } as unknown as Config;

      expect(heartbeat.getHttpSignedDataGatewayUrl(mockedConfig)).toEqual('http://localhost:8765/http-signed-data');
    });

    it('returns correct serverless gateway URL', () => {
      const mockedConfig = {
        nodeSettings: { cloudProvider: { type: 'aws', region: 'us-east1', disableConcurrencyReservations: false } },
      } as unknown as Config;

      expect(heartbeat.getHttpSignedDataGatewayUrl(mockedConfig)).toEqual(httpSignedDataGatewayUrl);
    });
  });

  describe('gateway URLs in heartbeat', () => {
    const baseConfig = fixtures.buildConfig();
    baseConfig.nodeSettings = {
      ...baseConfig.nodeSettings,
      httpSignedDataGateway: {
        corsOrigins: [],
        enabled: true,
        apiKey: 'e537bd93-9b4e-4fb3-b2c5-e2f3c66c1ace',
        maxConcurrency: 20,
      },
      httpGateway: {
        corsOrigins: [],
        enabled: true,
        apiKey: '9cf5a3b1-250d-4116-9a6e-5c37e525ecb3',
        maxConcurrency: 20,
      },
    };

    it('are send when deployed to cloud', async () => {
      executeMock.mockResolvedValueOnce({ received: true });
      const config = cloneDeep(baseConfig);
      config.nodeSettings.cloudProvider = { type: 'aws', disableConcurrencyReservations: false, region: 'us-east1' };
      const state = coordinatorState.create(config, 'coordinatorId');
      const heartbeatPayload = {
        http_gateway_url: httpGatewayUrl,
        http_signed_data_gateway_url: httpSignedDataGatewayUrl,
      };
      const signature = await heartbeat.signHeartbeat(heartbeatPayload);
      const logs = await heartbeat.reportHeartbeat(state);

      expect(logs).toEqual([
        { level: 'INFO', message: 'Sending heartbeat...' },
        { level: 'INFO', message: 'Heartbeat sent successfully' },
      ]);
      expect(executeMock).toHaveBeenCalledTimes(1);
      expect(executeMock).toHaveBeenCalledWith({
        url: 'https://example.com',
        method: 'post',
        headers: {
          'airnode-heartbeat-api-key': '3a7af83f-6450-46d3-9937-5f9773ce2849',
        },
        data: {
          http_gateway_url: httpGatewayUrl,
          http_signed_data_gateway_url: httpSignedDataGatewayUrl,
          signature,
        },
        timeout: 5_000,
      });
    });

    it('are send when run inside Airnode client', async () => {
      executeMock.mockResolvedValueOnce({ received: true });
      const config = cloneDeep(baseConfig);
      config.nodeSettings.cloudProvider = { type: 'local', gatewayServerPort: 8765 };
      const state = coordinatorState.create(config, 'coordinatorId');
      const heartbeatPayload = {
        http_gateway_url: 'http://localhost:8765/http-data',
        http_signed_data_gateway_url: 'http://localhost:8765/http-signed-data',
      };
      const signature = await heartbeat.signHeartbeat(heartbeatPayload);
      const logs = await heartbeat.reportHeartbeat(state);

      expect(logs).toEqual([
        { level: 'INFO', message: 'Sending heartbeat...' },
        { level: 'INFO', message: 'Heartbeat sent successfully' },
      ]);
      expect(executeMock).toHaveBeenCalledTimes(1);
      expect(executeMock).toHaveBeenCalledWith({
        url: 'https://example.com',
        method: 'post',
        headers: {
          'airnode-heartbeat-api-key': '3a7af83f-6450-46d3-9937-5f9773ce2849',
        },
        data: {
          ...heartbeatPayload,
          signature,
        },
        timeout: 5_000,
      });
    });
  });

  describe('signHearbeat', () => {
    const heartbeatPayload = {
      http_gateway_url: httpGatewayUrl,
      http_signed_data_gateway_url: httpSignedDataGatewayUrl,
    };
    const airnodeAddress = fixtures.getAirnodeWallet().address;

    it('signs verifiable heartbeat', async () => {
      const signature = await heartbeat.signHeartbeat(heartbeatPayload);
      const signerAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(['string', 'string'], [HEARTBEAT_SALT, JSON.stringify(heartbeatPayload)])
        ),
        signature
      );

      expect(signature).toEqual(
        '0x63aaa5d98ab6db7ccf6c2f67a47535feb42c32b125eb894a21f579b5be70cbe725499ef5fa909ec6f3960ee62e1e2968ce30f1192813b4e28d46497bf62d0ba71b'
      );
      expect(signerAddress).toEqual(airnodeAddress);
    });
  });

  it('handles signature errors', async () => {
    const signatureError = new Error('Signature error');
    jest.spyOn(heartbeat, 'signHeartbeat').mockImplementationOnce(() => {
      throw signatureError;
    });

    const config = fixtures.buildConfig();
    const coordinatorId = randomHexString(16);
    const state = coordinatorState.create(config, coordinatorId);
    const res = await heartbeat.reportHeartbeat(state);

    expect(res).toEqual([{ level: 'ERROR', message: 'Failed to sign heartbeat', error: signatureError }]);
  });
});
