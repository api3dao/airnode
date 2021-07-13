const executeMock = jest.fn();
jest.mock('@api3/adapter', () => ({
  execute: executeMock,
}));

import * as heartbeat from './heartbeat';
import * as coordinatorState from '../coordinator/state';
import * as fixtures from '../../test/fixtures';

describe('reportHeartbeat', () => {
  const OLD_ENV = process.env;

  const heartbeatConfig = {
    HEARTBEAT_API_KEY: '3a7af83f-6450-46d3-9937-5f9773ce2849',
    HEARTBEAT_ID: '2d14a39a-9f6f-41af-9905-99abf0e5e1f0',
    HEARTBEAT_URL: 'https://example.com',
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    (Object.keys(heartbeatConfig) as Array<keyof typeof heartbeatConfig>).forEach((key) => {
      process.env[key] = heartbeatConfig[key];
    });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('does nothing if the heartbeat is disabled', async () => {
    const nodeSettings = fixtures.buildNodeSettings({ enableHeartbeat: false });
    const config = fixtures.buildConfig({ nodeSettings });
    const state = coordinatorState.create(config);
    const res = await heartbeat.reportHeartbeat(state);
    expect(res).toEqual(null);
    expect(executeMock).not.toHaveBeenCalled();
  });

  Object.keys(heartbeatConfig).forEach((key) => {
    it(`does nothing if the ${key} environment variable is not set`, async () => {
      delete process.env[key];
      const nodeSettings = fixtures.buildNodeSettings({ enableHeartbeat: true });
      const config = fixtures.buildConfig({ nodeSettings });
      const state = coordinatorState.create(config);
      const res = await heartbeat.reportHeartbeat(state);
      expect(res).toEqual(null);
      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  it('sends the heartbeat', async () => {
    executeMock.mockResolvedValueOnce({ received: true });
    const nodeSettings = fixtures.buildNodeSettings({ enableHeartbeat: true });
    const config = fixtures.buildConfig({ nodeSettings });
    const state = coordinatorState.create(config);
    const res = await heartbeat.reportHeartbeat(state);
    expect(res).toEqual({ received: true });
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith({
      url: 'https://example.com',
      method: 'post',
      data: {
        api_key: '3a7af83f-6450-46d3-9937-5f9773ce2849',
        deployment_id: '2d14a39a-9f6f-41af-9905-99abf0e5e1f0',
        payload: {},
      },
      timeout: 5_000,
    });
  });
});
