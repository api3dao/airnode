describe('isLocal', () => {
  beforeEach(() => jest.resetModules());

  it('returns true for local providers', () => {
    const config = { nodeSettings: { cloudProvider: 'local:aws' } };
    jest.mock('../config', () => ({ config }));
    const { isLocal } = require('./utils');
    expect(isLocal()).toEqual(true);
  });

  it('returns false for cloud providers', () => {
    const config = { nodeSettings: { cloudProvider: 'aws' } };
    jest.mock('../config', () => ({ config }));
    const { isLocal } = require('./utils');
    expect(isLocal()).toEqual(false);
  });
});
