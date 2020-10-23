import { Log } from '../types';

/**
 * Formats string to validator warning
 * @param message - string to include as a warning message
 * @returns formatted validator warning
 */
export function warn(message: string): Log {
  return { level: 'warning', message };
}

/**
 * Formats string to validator error
 * @param message - string to include as an error message
 * @returns formatted validator error
 */
export function error(message: string): Log {
  return { level: 'error', message };
}
