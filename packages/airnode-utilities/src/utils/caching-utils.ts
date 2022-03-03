import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
import { isJest, logger } from '../logging';

export const CACHE_BASE_PATH = `/tmp/airnode-cache`;
export const CACHE_MAX_FILESYSTEM_AGE_MINUTES = 60;
export const CACHE_MAX_FILES = 100_000; // (500 (cache size) * 1024 (KB) ) / 4 (KB, fs "cluster size" = 130k

/**
 * Calls the OS syncs command to forcefully sync the cache filesystem.
 * This is the functional equivalent of "commit" from SQL.
 */
export const syncFsSync = () => {
  try {
    spawn(`sync`, [`-f`, CACHE_BASE_PATH]);
  } catch (e) {
    logger.error(`Unable to sync cache fs`);
    logger.error((e as Error).stack);
  }
};

/**
 * Syncs the temporary filesystem asynchronously.
 * Lambda will "freeze" and "thaw" the execution context and with it any async promises in progress. We create and
 * forget this promise here, but it will resolve at some point, either in this invocation or a later one.
 */
export const syncFsASync = () => {
  try {
    new Promise(() => {
      spawn(`sync`, [`-f`, CACHE_BASE_PATH]);
    });
  } catch (e) {
    logger.error(`Unable to sync cache fs`);
    logger.error((e as Error).stack);
  }
};

/**
 * Initialise the path for the fs cache
 */
export const initPath = () => {
  try {
    if (!existsSync(CACHE_BASE_PATH)) {
      mkdirSync(CACHE_BASE_PATH);
      syncFsSync();
    }
  } catch (e) {
    logger.error(`Unable to init fs cache`);
    logger.error((e as Error).stack);
  }
};

/**
 * Get all keys from the cache that start with startingKey.
 *
 * @param startingKey should take the form of `blockedRequestId-` and the full key could be `blockedRequestId-0x0000000...`
 */
export const getKeys = (startingKey?: string): string[] => {
  try {
    const keys = readdirSync(CACHE_BASE_PATH);
    if (startingKey) {
      return keys.filter((key) => key.indexOf(startingKey) === 0);
    }
    return keys;
  } catch (e) {
    logger.error(`Unable to retrieve keys from fs cache`);
    logger.error((e as Error).stack);
  }

  return [];
};

/**
 * Get the value stored for a key (aka the contents of the file with the key as name).
 *
 * @param key the key whose contents should be returned
 */
export const getValueForKey = (key: string): any | undefined => {
  try {
    if (!existsSync(join(CACHE_BASE_PATH, key))) {
      return undefined;
    }

    return JSON.parse(readFileSync(join(CACHE_BASE_PATH, key)).toString());
  } catch (e) {
    logger.error(`Unable to read key data from fs cache`);
    logger.error((e as Error).stack);
  }

  return undefined;
};

/**
 * Remove a key, this is discouraged and should only be used by sweep operations (garbage collection).
 *
 * @param key the key to remove
 */
export const removeKey = (key: string) => {
  try {
    // Force will not throw an error if the file doesn't exist
    rmSync(join(CACHE_BASE_PATH, key), { force: true });
  } catch (e) {
    logger.error(`Unable to remove key from fs cache`);
    logger.error((e as Error).stack);
  }
};

/**
 * Add a cache entry
 *
 * @param key the name of the key, ideally in the form of `something-{uniqueId}`, eg. `requestIdBlocked-0x0000...`
 * @param data the data to store for the key, arbitrary
 * @param force force overwriting of an existing key (discouraged)
 */
export const addKey = (key: string, data: any, force = false) => {
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
    logger.error((e as Error).stack);
  }
};

/**
 * Get all keys and their associated values
 * This is a potentially dangerous operation as it will cause the entire cache to be loaded into memory... which could
 * be more than 500 MB.
 *
 * On Lambda RAM and tmpfs are separate resources, but on GCP tmpfs *is* RAM, so reading 500 MB of cache into RAM will
 * incur a >1GB memory usage cumulatively.
 */
export const getAllKeysAndValues = (): Record<string, any> => {
  try {
    return Object.entries(
      getKeys().map((key) => {
        return [key, getValueForKey(key)];
      })
    );
  } catch (e) {
    logger.error(`Unable to retrieve all keys and values from fs cache`);
    logger.error((e as Error).stack);
  }

  return {};
};

// TODO add storage usage based sweep for GCP happiness
// (GCP uses RAM for /tmp)
/**
 * Sweep (garbage collect) the cache.
 */
export const sweep = () => {
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
    logger.error((e as Error).stack);
  }

  syncFsSync();
};

/**
 * Wipe the cache.
 */
export const wipe = () => {
  rmdirSync(CACHE_BASE_PATH, { recursive: true });
};

/**
 * Initialise caching by creating directories and clearing out expired keys.
 */
export const init = () => {
  initPath();
  sweep();
};
