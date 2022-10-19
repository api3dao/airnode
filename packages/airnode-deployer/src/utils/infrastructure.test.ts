import shuffle from 'lodash/shuffle';
import {
  BUCKET_NAME_REGEX,
  formatTerraformArguments,
  generateBucketName,
  translatePathsToDirectoryStructure,
  getAddressDirectory,
  getStageDirectory,
  Directory,
  deploymentComparator,
} from './infrastructure';
import { mockBucketDirectoryStructure, mockBucketDirectoryStructureList, mockDeployments } from '../../test/fixtures';

describe('formatTerraformArguments', () => {
  it(`prepends string arguments with '-'`, () => {
    const args = ['arg1', 'arg2', 'arg3'];
    expect(formatTerraformArguments(args)).toEqual(['-arg1', '-arg2', '-arg3']);
  });

  it(`formats two string array into '-key=value' format`, () => {
    const args = [
      ['arg1', 'value1'],
      ['arg2', 'value2'],
      ['arg3', 'value3'],
    ] as [string, string][];
    expect(formatTerraformArguments(args)).toEqual(['-arg1=value1', '-arg2=value2', '-arg3=value3']);
  });

  it(`formats three string array into '-outer_key="inner_key=value"' format`, () => {
    const args = [
      ['outer_key1', 'inner_key1', 'value1'],
      ['outer_key2', 'inner_key2', 'value2'],
      ['outer_key3', 'inner_key3', 'value3'],
    ] as [string, string, string][];
    expect(formatTerraformArguments(args)).toEqual([
      '-outer_key1="inner_key1=value1"',
      '-outer_key2="inner_key2=value2"',
      '-outer_key3="inner_key3=value3"',
    ]);
  });
});

describe('generateBucketName', () => {
  it('generate bucket name in the correct format', () => {
    expect(generateBucketName()).toMatch(BUCKET_NAME_REGEX);
  });
});

describe('translatePathsToDirectoryStructure', () => {
  it('translates a list of bucket paths into a virtual directory structure', () => {
    expect(translatePathsToDirectoryStructure(mockBucketDirectoryStructureList)).toEqual(mockBucketDirectoryStructure);
  });

  it('returns an empty object for an empty list of paths', () => {
    expect(translatePathsToDirectoryStructure([])).toEqual({});
  });
});

describe('getAddressDirectory', () => {
  it('returns an Airnode address directory', () => {
    expect(getAddressDirectory(mockBucketDirectoryStructure, '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace')).toEqual(
      mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace']
    );
  });

  it(`returns null if there's no Airnode address directory`, () => {
    expect(getAddressDirectory(mockBucketDirectoryStructure, '0x0f645a59dCE7A3c9c2608d58DF1e5C22888B7449')).toBeNull();
  });

  it(`throws an error if the entry's not a directory`, () => {
    expect(() =>
      getAddressDirectory(mockBucketDirectoryStructure, '0xdCb725091c67fC9f0fB78Bb2BB86d8d2DAC12C5a')
    ).toThrow(
      new Error(`Invalid directory structure, '0xdCb725091c67fC9f0fB78Bb2BB86d8d2DAC12C5a' should be a directory`)
    );
  });

  it('throws an error if the directory is empty', () => {
    expect(() =>
      getAddressDirectory(mockBucketDirectoryStructure, '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d')
    ).toThrow(
      new Error(`Invalid directory structure, '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d/' should not be empty`)
    );
  });
});

describe('getStageDirectory', () => {
  it('returns a stage directory', () => {
    expect(
      getStageDirectory(mockBucketDirectoryStructure, '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace', 'dev')
    ).toEqual(
      (mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory).children['dev']
    );
  });

  it(`returns null if there's no Airnode address directory`, () => {
    expect(
      getStageDirectory(mockBucketDirectoryStructure, '0x0f645a59dCE7A3c9c2608d58DF1e5C22888B7449', 'dev')
    ).toBeNull();
  });

  it(`throws an error if the entry's not a directory`, () => {
    expect(() =>
      getStageDirectory(mockBucketDirectoryStructure, '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043', 'devFile')
    ).toThrow(
      new Error(
        `Invalid directory structure, '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/devFile' should be a directory`
      )
    );
  });

  it('throws an error if the directory is empty', () => {
    expect(() =>
      getStageDirectory(mockBucketDirectoryStructure, '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043', 'devEmpty')
    ).toThrow(
      new Error(
        `Invalid directory structure, '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/devEmpty/' should not be empty`
      )
    );
  });
});

describe('deploymentComparator', () => {
  it('sorts the deployment correctly', () => {
    const deployments = shuffle(mockDeployments);

    expect(deployments.sort(deploymentComparator)).toEqual(mockDeployments);
  });
});
