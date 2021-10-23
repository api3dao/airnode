const executeMock = jest.fn();
jest.mock('@api3/airnode-adapter', () => ({
  execute: executeMock,
}));

import * as heartbeat from './heartbeat';
import * as coordinatorState from '../coordinator/state';
import * as fixtures from '../../test/fixtures';
import { Heartbeat } from '../types';

const heartbeatOptions: Array<keyof Heartbeat> = ['id', 'apiKey', 'url'];

describe('reportHeartbeat', () => {
  it('does nothing if the heartbeat is disabled', async () => {
    const nodeSettings = fixtures.buildNodeSettings({ heartbeat: { enabled: false } });
    const config = fixtures.buildConfig({ nodeSettings });
    const state = coordinatorState.create(config);
    const res = await heartbeat.reportHeartbeat(state);
    expect(res).toEqual([{ level: 'INFO', message: `Not sending heartbeat as 'nodeSettings.heartbeat' is disabled` }]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  heartbeatOptions.forEach((option) => {
    it(`does nothing if the ${option} option is not set`, async () => {
      const nodeSettings = fixtures.buildNodeSettings();
      // eslint-disable-next-line functional/immutable-data
      delete nodeSettings.heartbeat[option];
      const config = fixtures.buildConfig({ nodeSettings });
      const state = coordinatorState.create(config);
      const res = await heartbeat.reportHeartbeat(state);
      expect(res).toEqual([
        { level: 'WARN', message: 'Unable to send heartbeat as heartbeat configuration is missing' },
      ]);
      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  it('handles heartbeat errors', async () => {
    executeMock.mockRejectedValueOnce(new Error('Server is down'));
    const config = fixtures.buildConfig();
    const state = coordinatorState.create(config);
    const res = await heartbeat.reportHeartbeat(state);
    expect(res).toEqual([
      { level: 'INFO', message: 'Sending heartbeat...' },
      { level: 'ERROR', message: 'Failed to send heartbeat', error: new Error('Server is down') },
    ]);
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

  it('sends the heartbeat successfully', async () => {
    executeMock.mockResolvedValueOnce({ received: true });
    const config = fixtures.buildConfig();
    const state = coordinatorState.create(config);
    const logs = await heartbeat.reportHeartbeat(state);
    expect(logs).toEqual([
      { level: 'INFO', message: 'Sending heartbeat...' },
      { level: 'INFO', message: 'Heartbeat sent successfully' },
    ]);
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
