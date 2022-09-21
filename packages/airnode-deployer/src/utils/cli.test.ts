import {
  airnodeAddressReadable,
  cloudProviderReadable,
  hashDeployment,
  lastUpdateReadable,
  longArguments,
  printableArguments,
} from './cli';

describe('longArguments', () => {
  it('keeps only wanted arguments', () => {
    const args = {
      x: 1,
      aaa: 2,
      y: 3,
      bbb: 4,
      $0: 5,
      ccc: 6,
      z: 7,
    };
    expect(longArguments(args)).toEqual(`{"aaa":2,"bbb":4,"ccc":6}`);
  });
});

describe('printableArguments', () => {
  it(`prepends arguments with '--' and joins with ','`, () => {
    const args = ['arg1', 'arg2', 'arg3'];
    expect(printableArguments(args)).toEqual('--arg1, --arg2, --arg3');
  });
});

describe('hashDeployment', () => {
  it('creates a unique hash from depkloyment details', () => {
    const cloudProvider = 'aws';
    const region = 'us-east-1';
    const airnodeAddress = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace';
    const stage = 'dev';
    const airnodeVersion = '0.9.5';

    expect(hashDeployment(cloudProvider, region, airnodeAddress, stage, airnodeVersion)).toEqual('521d7174');
  });
});

describe('cloudProviderReadable', () => {
  it('returns a human-readble cloud provider identification', () => {
    expect(cloudProviderReadable('aws', 'us-east-1')).toEqual('AWS (us-east-1)');
  });
});

describe('airnodeAddressReadable', () => {
  it('returns a human-readble (shortened) Airnode address', () => {
    expect(airnodeAddressReadable('0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace')).toEqual('0xA30CA7...D4Dace');
  });
});

describe('lastUpdateReadable', () => {
  it('returns a human-readable time of deployment', () => {
    // Can't really check for a specific string as the timezone might be different on CI and I don't think
    // it makes much sense mocking it
    expect(lastUpdateReadable('1663745263102')).toMatch(/2022-09-\d{2} \d{2}:\d{2}:\d{2} .*/);
  });
});
