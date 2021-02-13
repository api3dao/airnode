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
 * @param template - object in which "__match" instances will be replaced in
 * @returns specs object with replaced "__match" instances
 */
export function replaceConditionalMatch(match: string, template: any): any {
  const substitute = (toReplace: string) => {
    return toReplace.replace(/__match/g, match);
  };

  return recursiveSubstitute(template, substitute, ['__conditions']);
}

/**
 * Replaces paths inside "[[]]" with value of the parameter in the path
 * @param specs - specification of parameter which is being validated
 * @param rootSpecs - root of the validated specification
 * @param template - template in which paths will be replaced
 */
export function replacePathsWithValues(specs: any, rootSpecs: any, template: any): any {
  const substitute = (toReplace: string) => {
    const matches = toReplace.match(/(?<=\[\[)[^\[\]]+(?=\]\])/);

    if (!matches) {
      return toReplace;
    }

    for (let param of matches) {
      let currentSpecs = specs;

      if (param.startsWith('/')) {
        param = param.replace('/', '');
        currentSpecs = rootSpecs;
      }

      const value = getSpecsFromPath(param, currentSpecs);

      if (value) {
        toReplace = toReplace.replace(`[[${currentSpecs === rootSpecs ? '/' : ''}${param}]]`, value);
      }
    }

    return toReplace;
  };

  return recursiveSubstitute(template, substitute, ['__conditions']);
}

/**
 * Calls provided substitute function on every key and string value in specs and replaces it with result of the function
 * @param specs - keys and string values of provided specification will be replaced with result of substitute function
 * @param substitute - function will be called with key or string value as a parameter, result of this function will replace original value in specification
 * @param ignoredKeys - list of keys, which will stop the recursion
 */
export function recursiveSubstitute(
  specs: any,
  substitute: (value: string) => string,
  ignoredKeys: string[] = []
): any {
  const filteredKeys = Object.keys(specs).filter((key) => !ignoredKeys.includes(key));

  if (Array.isArray(specs)) {
    return specs.map((value) => {
      if (typeof value === 'string') {
        return substitute(value);
      }

      return recursiveSubstitute(value, substitute, ignoredKeys);
    });
  }

  return filteredKeys.reduce((acc, key) => {
    const newKey = substitute(key);

    if (typeof specs[key] === 'string') {
      return { ...acc, [newKey]: substitute(specs[key]) };
    }

    const newValue = recursiveSubstitute(specs[key], substitute, ignoredKeys);
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
      if (nonRedundant[i] !== undefined) {
        messages.push(...warnExtraFields(nonRedundant[i], specs[i], `${paramPath}[${i}]`));
      }
    }

    return messages;
  }

  return Object.keys(specs).reduce((acc, key) => {
    if (nonRedundant[key] !== undefined) {
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
 * @param template - must be on the same level as specs
 * @param nonRedundantParams - object containing required and optional parameters that are used
 * @param specs - specification that is being validated
 * @returns empty value of the same type as parameter, if parameter exists in nonRedundantParams returns value of parameter
 */
export function getEmptyNonRedundantParam(param: string, template: any, nonRedundantParams: any, specs: any): any {
  if (nonRedundantParams[param]) {
    return nonRedundantParams[param];
  }

  if (
    '__arrayItem' in (template[param] || {}) ||
    '__arrayItem' in (template['__objectItem'] || {}) ||
    ('__any' in (template[param] || {}) && Array.isArray(specs))
  ) {
    return [];
  }

  return {};
}

/**
 * Inserts value into specification inside specified parameter, creates missing parameters in parameter if they don't exist and merges parameter with value if both of them are objects
 * @param paramPath - full path to parameter
 * @param spec - specification that will be modified
 * @param value - value that will be inserted
 */
export function insertValue(paramPath: string, spec: any, value: any) {
  let param = paramPath.split('.')[0];

  if (param === '') {
    for (const key of Object.keys(value)) {
      spec[key] = JSON.parse(JSON.stringify(value[key]));
    }

    return;
  }

  if (param === '__all') {
    paramPath = paramPath.replace('__all', '').replace('.', '');

    if (Array.isArray(spec)) {
      spec.forEach((item) => {
        insertValue(paramPath, item, value);
      });
    } else {
      for (const key in spec) {
        insertValue(paramPath, spec[key], value);
      }
    }

    return;
  }

  if (param.match(/\[([0-9]*|_)\]$/)) {
    let index = -1;

    if (param.match(/\[([0-9]+)\]$/)) {
      index = parseInt(param.match(/\[([0-9]+)\]$/)![1]);
    }

    if (param.match(/\[_\]$/)) {
      index = -2;
    }

    param = param.replace(/\[([0-9]*|_)\]$/, '');

    if (!spec[param]) {
      spec[param] = [];
    }

    spec = spec[param];

    if (index === -2) {
      index = spec.length - 1;
    }

    if (index === -1) {
      index = spec.length;
    }

    if (spec.length <= index) {
      spec.push({});
    }

    spec = spec[index];

    insertValue(paramPath.replace(paramPath.split('.')[0], '').replace('.', ''), spec, value);
    return;
  }

  if (paramPath.endsWith(param)) {
    spec[param] = JSON.parse(JSON.stringify(value));

    return;
  }

  if (!spec[param]) {
    spec[param] = {};
  }

  spec = spec[param];

  insertValue(paramPath.replace(`${param}`, '').replace('.', ''), spec, value);
}

/**
 * Replaces "{{index}}" keywords in paramPath with parameter names from path on "index"
 * @param paramPath - parameters path that can include "{{index}}", which will be replaced
 * @param path - path that will be used to replace "{{index}}" with appropriate parameter names
 */
export function replaceParamFromIndex(paramPath: string, path: string): string {
  if (paramPath === '' || path === '') {
    return paramPath;
  }

  const parsedPath = path.split('.');

  for (const match of paramPath.match(/\{\{([0-9]+)\}\}/g) || []) {
    const index = parseInt(match.match('[0-9]+')![0]);
    paramPath = paramPath.replace(new RegExp(`\\{\\{${index}\\}\\}`, 'g'), parsedPath[index]);
  }

  return paramPath;
}

/**
 * Returns object located on paramPath in specs
 * @param paramPath - path to parameter in specs that will be returned
 * @param specs - specification that will be searched for parameter
 * @param insertPath - won't return null if paramPath is not in the specs, but insert all missing parameters into specs
 * @returns object located on paramPath in specs or null if object does not exists in specs
 */
export function getSpecsFromPath(paramPath: string, specs: object, insertPath = false) {
  let paramName = paramPath.split('.')[0];

  const indexMatches = paramName.match(/(?<=\[)[0-9]+(?=\])/);

  if (indexMatches) {
    paramName = paramName.replace(`[${indexMatches[0]}]`, '');
  }

  if (!(paramName in specs)) {
    if (!insertPath) {
      return null;
    }

    if (indexMatches) {
      specs[paramName] = [];

      for (let i = 0; i < parseInt(indexMatches[0]); i++) {
        specs[paramName].push({});
      }
    } else {
      specs[paramName] = {};
    }
  }

  specs = specs[paramName];

  if (indexMatches) {
    specs = specs[parseInt(indexMatches[0])];
  }

  paramPath = paramPath.replace(`${paramName}${indexMatches ? `[${indexMatches[0]}]` : ''}`, '').replace('.', '');

  if (!paramPath.length) {
    return specs;
  }

  return getSpecsFromPath(paramPath, specs, insertPath);
}
