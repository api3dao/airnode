import * as logger from './logger';
import { Log } from '../types';

/**
 * Retrieves name of the last parameter in provided path
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @returns last parameter in paramPath
 */
export function getLastParamName(paramPath: string): string {
  const lastDotIndex = paramPath.lastIndexOf('.');

  if (lastDotIndex >= 0) {
    return paramPath.slice(lastDotIndex + 1);
  }

  return paramPath;
}

/**
 * Replaces all "__match" instances in provided object and all it's children, except children of "__conditions"
 * @param match - string that "__match" instances will be replaced with
 * @param specs - object in which "__match" instances will be replaced in
 * @returns specs object with replaced "__match" instances
 */
export function replaceConditionalMatch(match: string, specs: any): any {
  const ignoredKeys = ['__conditions'];
  const keys = Object.keys(specs);
  const filteredKeys = keys.filter((key) => !ignoredKeys.includes(key));

  return filteredKeys.reduce((acc, key) => {
    const newKey = key.replace(/__match/g, match);

    if (typeof specs[key] === 'string') {
      const newValue = specs[key].replace(/__match/g, match);
      return { ...acc, [newKey]: newValue };
    }

    const newValue = replaceConditionalMatch(match, specs[key]);
    return { ...acc, [newKey]: newValue };
  }, {});
}

/**
 * Checks if any extra fields are present
 * @param nonRedundant - object containing all required and optional parameters that are being used
 * @param specs - specification that is being validated
 * @param paramPath - in case an extra parameter is present, paramPath will be added in front of extra parameter in message
 * @returns validator messages of all extra parameters
 */
export function warnExtraFields(nonRedundant: any, specs: any, paramPath: string): Log[] {
  if (typeof specs !== 'object') {
    return [];
  }

  if (Array.isArray(specs)) {
    const messages: { level: 'warning' | 'error'; message: string }[] = [];

    for (let i = 0; i < specs.length; i++) {
      if (nonRedundant[i]) {
        messages.push(...warnExtraFields(nonRedundant[i], specs[i], `${paramPath}[${i}]`));
      }
    }

    return messages;
  }

  return Object.keys(specs).reduce((acc, key) => {
    if (nonRedundant[key]) {
      return [...acc, ...warnExtraFields(nonRedundant[key], specs[key], `${paramPath}${paramPath ? '.' : ''}${key}`)];
    }

    if (nonRedundant['__noCheck']) {
      return acc;
    }

    return [...acc, logger.warn(`Extra field: ${paramPath}${paramPath ? '.' : ''}${key}`)];
  }, []);
}

/**
 * Detects empty type that should be inserted into nonRedundantParams
 * @param param - name of the parameter of which the type should be determined
 * @param specsStruct - validator specification structure, must be on the same level as specs
 * @param nonRedundantParams - object containing required and optional parameters that are used
 * @param specs - specification that is being validated
 * @returns empty value of the same type as parameter, if parameter exists in nonRedundantParams returns value of parameter
 */
export function getEmptyNonRedundantParam(param: string, specsStruct: any, nonRedundantParams: any, specs: any): any {
  if (nonRedundantParams[param]) {
    return nonRedundantParams[param];
  }

  if ('__arrayItem' in (specsStruct[param] || {}) || ('__any' in (specsStruct[param] || {}) && Array.isArray(specs))) {
    return [];
  }

  return {};
}
