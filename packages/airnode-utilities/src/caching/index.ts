import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../logging';

export const CACHE_BASE_PATH = `/tmp/airnode-cache`;
export const CACHE_MAX_FILESYSTEM_AGE_MINUTES = 60;
export const CACHE_MAX_FILES = 20_000; // (500 (cache size) * 1024 (KB) ) / 4 (KB, fs "cluster size" = 130k

export const isJest = () => process.env.JEST_WORKER_ID !== undefined;

/**
 * Initialise the path for the fs cache
 */
const initPath = () => {
  try {
    if (!existsSync(CACHE_BASE_PATH)) {
      mkdirSync(CACHE_BASE_PATH);
    }
  } catch (e) {
    logger.error(`Unable to init fs cache`);
    logger.error((e as Error).stack!);
  }
};

/**
 * Get all keys from the cache that start with startingKey.
 *
 * @param prefix should take the form of `blockedRequestId-` and the full key could be `blockedRequestId-0x0000000...`
 */
const getKeys = (prefix?: string): string[] => {
  try {
    const keys = readdirSync(CACHE_BASE_PATH);
    if (prefix) {
      return keys.filter((key) => key.indexOf(prefix) === 0);
    }
    return keys;
  } catch (e) {
    logger.error(`Unable to retrieve keys from fs cache`);
    logger.error((e as Error).stack!);
  }

  return [];
};

/**
 * Get the value stored for a key (a.k.a the contents of the file with the key as name).
 *
 * @param key the key whose contents should be returned
 */
const getValueForKey = (key: string): any | undefined => {
  try {
    if (!existsSync(join(CACHE_BASE_PATH, key))) {
      return undefined;
    }

    return JSON.parse(readFileSync(join(CACHE_BASE_PATH, key)).toString());
  } catch (e) {
    logger.error(`Unable to read key data from fs cache`);
    logger.error((e as Error).stack!);
  }

  return undefined;
};

/**
 * Remove a key
 *
 * @param key the key to remove
 */
const removeKey = (key: string) => {
  try {
    // Force will not throw an error if the file doesn't exist
    rmSync(join(CACHE_BASE_PATH, key), { force: true });
  } catch (e) {
    logger.error(`Unable to remove key from fs cache`);
    logger.error((e as Error).stack!);
  }
};

/**
 * Add a cache entry
 *
 * @param key the name of the key, ideally in the form of `something-{uniqueId}`, eg. `requestIdBlocked-0x0000...`
 * @param data the data to store for the key, arbitrary
 * @param force force overwriting of an existing key
 */
const addKey = (key: string, data: any, force = false) => {
  // To not break existing tests do nothing if we're executing in a test environment.
  if (isJest() && !force) {
    return;
  }

  const filePath = join(CACHE_BASE_PATH, key);
  try {
    const fileExists = existsSync(filePath);
    if (fileExists && !force) {
      logger.error(`Unable to overwrite key from fs cache as key exists and force is set to false`);
      logger.error(`Key: ${key}`);
      return;
    }

    if (fileExists) {
      rmSync(filePath, { force: true });
    }

    writeFileSync(filePath, JSON.stringify(data));
  } catch (e) {
    logger.error(`Unable to remove key from fs cache`);
    logger.error((e as Error).stack!);
  }
};

// TODO add storage usage based sweep for GCP happiness
// (GCP uses RAM for /tmp)
/**
 * Sweep (garbage collect) the cache.
 */
const sweep = () => {
  try {
    const now = Date.now();

    const stattedFiles = readdirSync(CACHE_BASE_PATH).map((file) => ({
      ...statSync(join(CACHE_BASE_PATH, file)),
      file,
    }));

    const deletedFiles = stattedFiles
      .filter((fileDetails) => now - fileDetails.mtimeMs > CACHE_MAX_FILESYSTEM_AGE_MINUTES * 60 * 1000)
      .map((fileDetails) => {
        rmSync(fileDetails.file, { force: true });
        return fileDetails;
      });

    const remainingFiles = stattedFiles.filter((file) => !deletedFiles.includes(file));

    if (remainingFiles.length < CACHE_MAX_FILES) {
      return;
    }

    // Delete oldest cache entries first
    type statFile = { file: string; mtimeMs: number };
    const sortFn = (a: statFile, b: statFile) => {
      if (a.mtimeMs > b.mtimeMs) {
        return -1;
      }

      if (a.mtimeMs < b.mtimeMs) {
        return 1;
      }

      return 0;
    };

    remainingFiles
      .sort(sortFn)
      .slice(CACHE_MAX_FILES)
      .forEach((fileDetails) => {
        rmSync(fileDetails.file, { force: true });
      });
  } catch (e) {
    logger.error(`Unable to sweep old files from fs cache`);
    logger.error((e as Error).stack!);
  }
};

/**
 * Wipe the cache.
 */
const wipe = () => {
  rmdirSync(CACHE_BASE_PATH, { recursive: true });
};

/**
 * Initialise caching by creating directories and clearing out expired keys.
 */
const init = () => {
  initPath();
  sweep();
};

export const caching = {
  init,
  wipe,
  addKey,
  removeKey,
  getValueForKey,
  getKeys,
  sweep,
  initPath,
};
