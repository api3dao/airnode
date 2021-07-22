import * as msg from '../utils/messages';
import { Log } from '../types';

/**
 * Checks if type in specification matches provided type
 * @param specs - specification parameter that will be checked
 * @param type - standard typescript type
 * @param paramPath - array of keys leading to current specification
 * @param paramPathPrefix - parameter path to current template in case it is nested
 */
export function validateType(specs: any, type: string, paramPath: string[], paramPathPrefix: string[]): Log[] {
  if (typeof specs !== type) {
    return [msg.incorrectType([...paramPathPrefix, ...paramPath], type, typeof specs)];
  }

  return [];
}
