import { randomBytes } from 'crypto';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import difference from 'lodash/difference';
import { compareVersions } from 'compare-versions';
import * as logger from './logger';
import { Deployment } from '../infrastructure';

type CommandArg = string | [string, string] | [string, string, string];

const DEPLOYMENT_REQUIRED_FILE_NAMES = ['config.json', 'secrets.env', 'default.tfstate'];

export function formatTerraformArguments(args: CommandArg[]) {
  return args
    .map((arg) => {
      if (!isArray(arg)) {
        return arg;
      }

      if (arg.length === 2) {
        return `${arg[0]}=${arg[1]}`;
      }

      return `${arg[0]}="${arg[1]}=${arg[2]}"`;
    })
    .map((arg) => `-${arg}`);
}

/**
 * Checks if the environment is a GCP or AWS cloud function
 */
export const isCloudFunction = () => process.env.LAMBDA_TASK_ROOT || process.env.FUNCTION_TARGET;

export const logAndReturnError = (message: string) => {
  logger.fail(message);
  return new Error(message);
};

export class MultiMessageError extends Error {
  constructor(public messages: string[]) {
    super(messages.join('\n'));
  }
}

export const BUCKET_NAME_REGEX = /^airnode-[a-f0-9]{12}$/;
export const generateBucketName = () => `airnode-${randomBytes(6).toString('hex')}`;

export type Bucket = {
  name: string;
  region: string;
};

export enum FileSystemType {
  Directory = 'Directory',
  File = 'File',
}

export type FileSystemItem = Directory | File;

export type Directory = {
  type: FileSystemType.Directory;
  bucketKey: string;
  children: DirectoryStructure;
};

export type File = {
  type: FileSystemType.File;
  bucketKey: string;
};

export type DirectoryStructure = Record<string, FileSystemItem>;

export const translatePathsToDirectoryStructure = (paths: String[]) => {
  const directoryStructure: DirectoryStructure = {};

  paths.forEach((path) => {
    // Split on each '/' except for the one on the end if there is such (for identifying directories).
    // E.g. for path '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/' it's ['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace', 'dev', '1662730904/']
    //
    // Reduce is used to traverse deeper and deeper through the directory structure, adding levels during the first pass (first path) and reusing them for the rest (paths with the common parts, path prefix).
    // The same `directoryStructure` variable is used as a starting point for each path so we end up with one fully populated directory structure.
    path.split(/\/(?!$)/).reduce((directoryStructureAtGivenDepth, name, index, splitParts) => {
      // Bucket key of an item is its path within the directory structure
      const bucketKey = splitParts.slice(0, index + 1).join('/');
      let sanitizedName = name;
      if (name.endsWith('/')) {
        sanitizedName = name.slice(0, -1);
      }

      // If there's not yet an item in the directory structure at given path we add it.
      // This is necessary as we potentially go through multiple items of the same path.
      // E.g. '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/config.json' and '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/secrets.env'
      if (!directoryStructureAtGivenDepth[sanitizedName]) {
        let newItem: FileSystemItem = { type: FileSystemType.Directory, bucketKey, children: {} };
        // If we're at the end of the path and the item name doesn't end with a '/' it's a file, not a directory.
        if (index === splitParts.length - 1 && !name.endsWith('/')) {
          newItem = { type: FileSystemType.File, bucketKey };
        }

        // eslint-disable-next-line functional/immutable-data
        directoryStructureAtGivenDepth[sanitizedName] = newItem;
      }

      const currentItem = directoryStructureAtGivenDepth[sanitizedName];
      // If we're processing a directory within the path, we return a directory structure one level deeper.
      return currentItem.type === FileSystemType.Directory ? currentItem.children : {};
    }, directoryStructure);
  });

  return directoryStructure;
};

export const getAddressDirectory = (directoryStructure: DirectoryStructure, airnodeAddress: string) => {
  const addressDirectory = directoryStructure[airnodeAddress];
  if (!addressDirectory) {
    return null;
  }
  if (addressDirectory.type !== FileSystemType.Directory) {
    throw new Error(`Invalid directory structure, '${addressDirectory.bucketKey}' should be a directory`);
  }
  if (Object.keys(addressDirectory.children).length === 0) {
    throw new Error(`Invalid directory structure, '${addressDirectory.bucketKey}' should not be empty`);
  }

  return addressDirectory;
};

export const getStageDirectory = (directoryStructure: DirectoryStructure, airnodeAddress: string, stage: string) => {
  const addressDirectory = getAddressDirectory(directoryStructure, airnodeAddress);
  if (!addressDirectory) {
    return null;
  }

  const stageDirectory = addressDirectory.children[stage];
  if (!stageDirectory) {
    return null;
  }
  if (stageDirectory.type !== FileSystemType.Directory) {
    throw new Error(`Invalid directory structure, '${stageDirectory.bucketKey}' should be a directory`);
  }
  if (Object.keys(stageDirectory.children).length === 0) {
    throw new Error(`Invalid directory structure, '${stageDirectory.bucketKey}' should not be empty`);
  }

  return stageDirectory;
};

export const deploymentComparator = (a: Deployment, b: Deployment) => {
  const typeComparison = a.cloudProvider.type.localeCompare(b.cloudProvider.type);
  if (typeComparison !== 0) return typeComparison;

  // We will never get to compare two different cloud providers here, that's handled above
  const projectIdComparison =
    a.cloudProvider.type === 'gcp' && b.cloudProvider.type === 'gcp'
      ? a.cloudProvider.projectId.localeCompare(b.cloudProvider.projectId)
      : 0;
  if (projectIdComparison !== 0) return projectIdComparison;

  const regionComparison = a.cloudProvider.region.localeCompare(b.cloudProvider.region);
  if (regionComparison !== 0) return regionComparison;

  const addressComparison = a.airnodeAddress.localeCompare(b.airnodeAddress);
  if (addressComparison !== 0) return addressComparison;

  const stageComparison = a.stage.localeCompare(b.stage);
  if (stageComparison !== 0) return stageComparison;

  return compareVersions(a.airnodeVersion, b.airnodeVersion);
};

export const getMissingBucketFiles = (
  directoryStructure: DirectoryStructure
): Record<string, Record<string, string[]>> =>
  Object.entries(directoryStructure).reduce((acc, [airnodeAddress, addressDirectory]) => {
    if (addressDirectory.type !== FileSystemType.Directory) {
      return acc;
    }

    const checkedAddressDirectory = Object.entries(addressDirectory.children).reduce((acc, [stage, stageDirectory]) => {
      if (stageDirectory.type !== FileSystemType.Directory) {
        return acc;
      }

      const latestDeployment = Object.keys(stageDirectory.children).sort().reverse()[0];
      const latestDepolymentFileNames = Object.keys(
        (stageDirectory.children[latestDeployment] as Directory)?.children || {}
      );

      const missingRequiredFiles = difference(DEPLOYMENT_REQUIRED_FILE_NAMES, latestDepolymentFileNames);
      if (isEmpty(missingRequiredFiles)) {
        return { ...acc, [airnodeAddress]: { [stage]: [] } };
      }

      logger.warn(
        `Airnode '${airnodeAddress}' with stage '${stage}' is missing files: ${missingRequiredFiles.join(
          ', '
        )}. Deployer commands may fail and manual removal may be necessary.`
      );

      return { ...acc, [airnodeAddress]: { [stage]: missingRequiredFiles } };
    }, {});

    return { ...acc, ...checkedAddressDirectory };
  }, {});
