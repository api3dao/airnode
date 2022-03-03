import child_process from 'child_process';
import { getCommitHash, getTag, isStagingClean } from './git-utils';

describe('git utilities', () => {
  it('returns a commit hash', () => {
    const commitHash = getCommitHash();

    expect(commitHash.length).toEqual(40);
  });

  it('returns a tag when the commit is tagged', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');

    execSyncSpy.mockImplementation((command: string) => {
      switch (command) {
        case 'git rev-parse HEAD':
          return 'f1ebf54dbcbf5f85bf66c3ec87fde89397d75eac';
        case 'git show-ref --tags':
          return `a6f8005d279185cc9fe35aa794efcc1b7807ddf5 refs/tags/@api3/airnode-abi@0.2.0
4e9c286d25f7719201859388a185cfcab48d08ca refs/tags/@api3/airnode-abi@0.2.1
6457c29c5645e5d943f524716bec0e88b8d57a5d refs/tags/@api3/airnode-abi@0.2.2
f0b81675071c92f7b3f21716b22cfe88cc27df14 refs/tags/@api3/airnode-abi@0.3.0
dbb22f129efd9b7783a7401251587462b5c3e9da refs/tags/@api3/airnode-abi@0.3.1
f1ebf54dbcbf5f85bf66c3ec87fde89397d75eac refs/tags/@api3/airnode-abi@0.4.0
8f6f4418a1e96d2e0ae1cb83f43f535c2d7e8eae refs/tags/@api3/airnode-abi@0.4.1
`;
        default:
          return '';
      }
    });

    const tag = getTag();
    expect(tag).toEqual('0.4.0');
    expect(execSyncSpy).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when the commit is not tagged', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');

    execSyncSpy.mockImplementation((command: string) => {
      switch (command) {
        case 'git rev-parse HEAD':
          return 'impossible-hash';
        case 'git show-ref --tags':
          return `a6f8005d279185cc9fe35aa794efcc1b7807ddf5 refs/tags/@api3/airnode-abi@0.2.0
4e9c286d25f7719201859388a185cfcab48d08ca refs/tags/@api3/airnode-abi@0.2.1
6457c29c5645e5d943f524716bec0e88b8d57a5d refs/tags/@api3/airnode-abi@0.2.2
f0b81675071c92f7b3f21716b22cfe88cc27df14 refs/tags/@api3/airnode-abi@0.3.0
dbb22f129efd9b7783a7401251587462b5c3e9da refs/tags/@api3/airnode-abi@0.3.1
f1ebf54dbcbf5f85bf66c3ec87fde89397d75eac refs/tags/@api3/airnode-abi@0.4.0
8f6f4418a1e96d2e0ae1cb83f43f535c2d7e8eae refs/tags/@api3/airnode-abi@0.4.1
`;
        default:
          return '';
      }
    });

    const tag = getTag();
    expect(tag).toEqual(undefined);
    expect(execSyncSpy).toHaveBeenCalledTimes(2);
  });

  it('returns false when there are changes for tracked files', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');

    execSyncSpy.mockReturnValueOnce(`On branch push-docker-images-from-ci
Your branch is up to date with 'origin/push-docker-images-from-ci'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   .changeset/mighty-mirrors-beg.md

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   packages/airnode-examples/scripts/deploy-airnode.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .idea/
`);

    const isClean = isStagingClean();
    expect(isClean).toEqual(false);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('returns true when there are no changes for tracked files', () => {
    const execSyncSpy = jest.spyOn(child_process, 'execSync');

    execSyncSpy.mockReturnValueOnce(`On branch push-docker-images-from-ci
Your branch is up to date with 'origin/push-docker-images-from-ci'.
`);

    const isClean = isStagingClean();
    expect(isClean).toEqual(true);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
  });
});
