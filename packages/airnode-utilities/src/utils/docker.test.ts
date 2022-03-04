import child_process from 'child_process';
import { getDockerImage, imageAvailableOnDockerHub } from './docker';
import * as git from './git';

describe('docker utilities', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  it('returns true when the target docker image exists - mocked execSync', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');
    execSyncSpy.mockReturnValueOnce('0');

    const result = imageAvailableOnDockerHub(`api3/airnode-deployer:latest`);
    expect(result).toEqual(true);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('returns false when the target docker image does not exist - mocked execSync', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');
    execSyncSpy.mockReturnValueOnce('1');

    const result = imageAvailableOnDockerHub(`api3/airnode-deployer:latest`);
    expect(result).toEqual(false);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('returns true when the target docker image exists - real docker hub', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');

    const result = imageAvailableOnDockerHub(`api3/airnode-deployer:latest`);
    expect(result).toEqual(true);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('returns false when the target docker image does not exist - real docker hub', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');

    const result = imageAvailableOnDockerHub(`api3/airnode-deployer:impossible-tag`);
    expect(result).toEqual(false);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('returns docker image path in CI', () => {
    process.env.COMMIT = 'something';

    const execSyncSpy = jest.spyOn(child_process, 'execSync');
    execSyncSpy.mockImplementation((command: string) => {
      switch (command) {
        case 'git rev-parse HEAD':
          return 'something';
        case 'git status':
          return 'an output';
        case 'docker manifest inspect api3/airnode-deployer-dev:something > /dev/null ; echo $?':
          return '0';
        default:
          return '';
      }
    });
    const getTagSpy = jest.spyOn(git, 'getTag');
    getTagSpy.mockReturnValueOnce(undefined);

    const result = getDockerImage('deployer');
    expect(result).toEqual(`api3/airnode-deployer-dev:${process.env.COMMIT}`);
  });

  it('returns latest docker image path when changes are pending', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');
    execSyncSpy.mockImplementation((command: string) => {
      switch (command) {
        case 'git rev-parse HEAD':
          return 'something';
        case 'git status':
          return 'Changes to be committed';
        case 'docker manifest inspect api3/airnode-deployer-dev:something > /dev/null ; echo $?':
          return '0';
        default:
          return '';
      }
    });
    const getTagSpy = jest.spyOn(git, 'getTag');
    getTagSpy.mockReturnValueOnce(undefined);

    const result = getDockerImage('deployer');
    expect(result).toEqual(`api3/airnode-deployer:latest`);
  });

  it('returns latest docker image path when changes are committed but image is unavailable', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');
    execSyncSpy.mockImplementation((command: string) => {
      switch (command) {
        case 'git rev-parse HEAD':
          return 'something';
        case 'git status':
          return 'an output';
        case 'docker manifest inspect api3/airnode-deployer-dev:something > /dev/null ; echo $?':
          return '1';
        default:
          return '';
      }
    });
    const getTagSpy = jest.spyOn(git, 'getTag');
    getTagSpy.mockReturnValueOnce(undefined);

    const result = getDockerImage('deployer');
    expect(result).toEqual(`api3/airnode-deployer:latest`);
  });

  it('returns a tagged image when the current commit is tagged', () => {
    // Must be called to make the mock work
    git.getTag();

    const execSyncSpy = jest.spyOn(child_process, 'execSync');
    execSyncSpy.mockImplementation((command: string) => {
      switch (command) {
        case 'git rev-parse HEAD':
          return 'f1ebf54dbcbf5f85bf66c3ec87fde89397d75eac';
        case 'git status':
          return 'an output';
        case 'git show-ref --tags':
          return `a6f8005d279185cc9fe35aa794efcc1b7807ddf5 refs/tags/@api3/airnode-abi@0.2.0
4e9c286d25f7719201859388a185cfcab48d08ca refs/tags/@api3/airnode-abi@0.2.1
6457c29c5645e5d943f524716bec0e88b8d57a5d refs/tags/@api3/airnode-abi@0.2.2
f0b81675071c92f7b3f21716b22cfe88cc27df14 refs/tags/@api3/airnode-abi@0.3.0
dbb22f129efd9b7783a7401251587462b5c3e9da refs/tags/@api3/airnode-abi@0.3.1
f1ebf54dbcbf5f85bf66c3ec87fde89397d75eac refs/tags/@api3/airnode-abi@0.4.0
8f6f4418a1e96d2e0ae1cb83f43f535c2d7e8eae refs/tags/@api3/airnode-abi@0.4.1
`;
        case 'docker manifest inspect api3/airnode-deployer-dev:4e9c286d25f7719201859388a185cfcab48d08ca > /dev/null ; echo $?':
          return '1';
        case 'docker manifest inspect api3/airnode-deployer:0.4.0 > /dev/null ; echo $?':
          return '0';
        default:
          return '';
      }
    });

    const result = getDockerImage('deployer');
    expect(result).toEqual(`api3/airnode-deployer:0.4.0`);
    expect(execSyncSpy).toHaveBeenCalledTimes(5);
  });
});
