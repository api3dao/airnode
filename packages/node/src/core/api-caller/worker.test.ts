const spawnAwsMock1 = jest.fn();
const spawnLocalAwsMock1 = jest.fn();
jest.mock('../workers/cloud-platforms/aws', () => ({
  spawn: spawnAwsMock1,
  spawnLocal: spawnLocalAwsMock1,
}));

describe('spawnNewApiCall', () => {
  beforeEach(() => jest.resetModules());

  it('handles local AWS calls', async () => {
    const config = { nodeSettings: { cloudProvider: 'local:aws' } };
    jest.mock('../config', () => ({ config }));

    spawnLocalAwsMock1.mockResolvedValueOnce({ value: '0x123' });

    const { spawnNewApiCall } = require('./worker');

    const options = {
      oisTitle: 'my-api',
      endpointName: 'my-endpoint',
      parameters: { from: 'ETH' },
    };

    const res = await spawnNewApiCall(options);
    expect(res).toEqual({ value: '0x123' });

    expect(spawnLocalAwsMock1).toHaveBeenCalledTimes(1);
    expect(spawnLocalAwsMock1).toHaveBeenCalledWith({
      functionName: 'callApi',
      payload: {
        queryStringParameters: {
          oisTitle: 'my-api',
          endpointName: 'my-endpoint',
          parameters: { from: 'ETH' },
        },
      },
    });
  });

  it('handles remote AWS calls', async () => {
    const config = { nodeSettings: { cloudProvider: 'aws' } };
    jest.mock('../config', () => ({ config }));

    spawnAwsMock1.mockResolvedValueOnce({ value: '0x123' });

    const { spawnNewApiCall } = require('./worker');

    const options = {
      oisTitle: 'my-api',
      endpointName: 'my-endpoint',
      parameters: { from: 'USDC' },
    };

    const res = await spawnNewApiCall(options);
    expect(res).toEqual({ value: '0x123' });

    expect(spawnAwsMock1).toHaveBeenCalledTimes(1);
    expect(spawnAwsMock1).toHaveBeenCalledWith({
      functionName: 'callApi',
      payload: {
        oisTitle: 'my-api',
        endpointName: 'my-endpoint',
        parameters: { from: 'USDC' },
      },
    });
  });
});
