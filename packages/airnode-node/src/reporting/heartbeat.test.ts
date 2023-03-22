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

describe('reportHeartbeat', () => {
  const httpGatewayUrl = 'https://some.http.gateway.url/v1/';
  const httpSignedDataGatewayUrl = 'https://some.http.signed.data.gateway.url/v1/';
  const oevGatewayUrl = 'https://some.oev.gateway.url/v1/';
  fixtures.setEnvVariables({
    HTTP_GATEWAY_URL: httpGatewayUrl,
    HTTP_SIGNED_DATA_GATEWAY_URL: httpSignedDataGatewayUrl,
    OEV_GATEWAY_URL: oevGatewayUrl,
    AIRNODE_WALLET_PRIVATE_KEY: fixtures.getAirnodeWalletPrivateKey(),
  });
  const systemTimestamp = 1661582890984;
  const expectedTimestamp = 1661582891;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => systemTimestamp);
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
    const heartbeatPayload = JSON.stringify({
      timestamp: expectedTimestamp,
      stage: state.config.nodeSettings.stage,
      cloud_provider: state.config.nodeSettings.cloudProvider.type,
      deployment_id: state.settings.deploymentId,
      http_gateway_url: 'http://localhost:3000/http-data',
      http_signed_data_gateway_url: 'http://localhost:3000/http-signed-data',
      oev_gateway_url: 'http://localhost:3000/sign-oev',
    });
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
        payload: heartbeatPayload,
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
    const heartbeatPayload = JSON.stringify({
      timestamp: expectedTimestamp,
      stage: state.config.nodeSettings.stage,
      cloud_provider: state.config.nodeSettings.cloudProvider.type,
      deployment_id: state.settings.deploymentId,
      http_gateway_url: 'http://localhost:3000/http-data',
      http_signed_data_gateway_url: 'http://localhost:3000/http-signed-data',
      oev_gateway_url: 'http://localhost:3000/sign-oev',
    });
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
        payload: heartbeatPayload,
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

  describe('getOevGatewayUrl', () => {
    it('returns correct local gateway URL', () => {
      const mockedConfig = {
        nodeSettings: { cloudProvider: { type: 'local', gatewayServerPort: 8765 } },
      } as unknown as Config;

      expect(heartbeat.getOevGatewayUrl(mockedConfig)).toEqual('http://localhost:8765/sign-oev');
    });

    it('returns correct serverless gateway URL', () => {
      const mockedConfig = {
        nodeSettings: { cloudProvider: { type: 'aws', region: 'us-east1', disableConcurrencyReservations: false } },
      } as unknown as Config;

      expect(heartbeat.getOevGatewayUrl(mockedConfig)).toEqual(oevGatewayUrl);
    });
  });

  describe('gateway URLs in heartbeat', () => {
    const baseConfig = fixtures.buildConfig();
    baseConfig.nodeSettings = {
      ...baseConfig.nodeSettings,
      httpSignedDataGateway: {
        corsOrigins: [],
        enabled: true,
        maxConcurrency: 20,
      },
      httpGateway: {
        corsOrigins: [],
        enabled: true,
        maxConcurrency: 20,
      },
      oevGateway: {
        corsOrigins: [],
        enabled: true,
        maxConcurrency: 20,
      },
    };

    it('are sent when deployed to cloud', async () => {
      executeMock.mockResolvedValueOnce({ received: true });
      const config = cloneDeep(baseConfig);
      const region = 'us-east1';
      config.nodeSettings.cloudProvider = { type: 'aws', disableConcurrencyReservations: false, region };
      const state = coordinatorState.create(config, 'coordinatorId');
      const heartbeatPayload = JSON.stringify({
        timestamp: expectedTimestamp,
        stage: state.config.nodeSettings.stage,
        cloud_provider: state.config.nodeSettings.cloudProvider.type,
        deployment_id: state.settings.deploymentId,
        region,
        http_gateway_url: httpGatewayUrl,
        http_signed_data_gateway_url: httpSignedDataGatewayUrl,
        oev_gateway_url: oevGatewayUrl,
      });
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
          payload: heartbeatPayload,
          signature,
        },
        timeout: 5_000,
      });
    });

    it('are sent when run inside Airnode client', async () => {
      executeMock.mockResolvedValueOnce({ received: true });
      const config = cloneDeep(baseConfig);
      config.nodeSettings.cloudProvider = { type: 'local', gatewayServerPort: 8765 };
      const state = coordinatorState.create(config, 'coordinatorId');
      const heartbeatPayload = JSON.stringify({
        timestamp: expectedTimestamp,
        stage: state.config.nodeSettings.stage,
        cloud_provider: state.config.nodeSettings.cloudProvider.type,
        deployment_id: state.settings.deploymentId,
        http_gateway_url: 'http://localhost:8765/http-data',
        http_signed_data_gateway_url: 'http://localhost:8765/http-signed-data',
        oev_gateway_url: 'http://localhost:8765/sign-oev',
      });
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
          payload: heartbeatPayload,
          signature,
        },
        timeout: 5_000,
      });
    });
  });

  describe('signHeartbeat', () => {
    const airnodeAddress = fixtures.getAirnodeWallet().address;
    const heartbeatPayload = JSON.stringify({
      timestamp: expectedTimestamp,
      stage: 'test',
      cloud_provider: 'local',
      deployment_id: 'local02cce763',
      http_gateway_url: httpGatewayUrl,
      http_signed_data_gateway_url: httpSignedDataGatewayUrl,
      oev_gateway_url: oevGatewayUrl,
    });

    it('signs verifiable heartbeat', async () => {
      const signature = await heartbeat.signHeartbeat(heartbeatPayload);
      const signerAddress = ethers.utils.verifyMessage(heartbeatPayload, signature);

      expect(signature).toEqual(
        '0x7c0415f3e5d120306c0a810626289abec1aad5fcf99fd68e0dbe9f8625811a1220f99205ead02ed6836af6184699745a9e73fbb920186cfd91bb7935df230eec1c'
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
