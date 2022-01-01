import * as logger from './logger';
import { keywords, regexList } from './globals';
import { Log, Roots } from '../types';

/**
 * Replaces all "__match" instances in provided object and all it's children, except children of "__conditions"
 * @param match - string that "__match" instances will be replaced with
 * @param template - object in which "__match" instances will be replaced in
 * @returns specs object with replaced "__match" instances
 */
export function replaceConditionalMatch(match: any, template: any): any {
  if (typeof match !== 'string') {
    match = match.toString();
  }

  const escapedMatch = match.replace(regexList.regexTokens, '\\$&');
  const substitute = (toReplace: string, key?: string) => {
    if (key === keywords.regexp || key === keywords.keyRegexp) {
      return toReplace.replace(new RegExp(keywords.match, 'g'), escapedMatch);
    }

    return toReplace.replace(new RegExp(keywords.match, 'g'), match);
  };

  return recursiveSubstitute(template, substitute, [keywords.conditions]);
}

/**
 * Replaces paths inside "[[]]" with value of the parameter in the path
 * @param specs - specification of parameter which is being validated
 * @param rootSpecs - root of the validated specification
 * @param template - template in which paths will be replaced
 */
export function replacePathsWithValues(specs: any, rootSpecs: any, template: any): any {
  const substitute = (toReplace: string, key?: string) => {
    const matches = toReplace.match(regexList.parameterValuePath);

    if (!matches) {
      return toReplace;
    }

    for (const pathStr of matches) {
      let pathArr;

      try {
        pathArr = JSON.parse(pathStr.replace(/'/g, '"')) as string[];
      } catch {
        continue;
      }

      let currentSpecs = specs;

      if (pathArr[0] === '/') {
        pathArr = pathArr.slice(1);
        currentSpecs = rootSpecs;
      }

      let value = getSpecsFromPath(pathArr, currentSpecs);

      if (value) {
        if (key === keywords.regexp || key === keywords.keyRegexp) {
          value = value.replace(regexList.regexTokens, '\\$&');
        }

        toReplace = toReplace.replace(`[${pathStr}]`, value);
      }
    }

    return toReplace;
  };

  return recursiveSubstitute(template, substitute, [keywords.conditions]);
}

/**
 * Replace all "{{index}}" occurrences in provided specification with parameter name on "index"
 * @param specs - parameter indices in this specification will be replaced
 * @param paramPath - path that will be used to replace "{{index}}" with appropriate parameter names
 */
export function replaceParamIndexWithName(specs: any, paramPath: string[]): any {
  const substitute = (toReplace: string, key?: string) => {
    for (const match of toReplace.match(regexList.parameterNameIndex) || []) {
      const index = parseInt(match.match('[0-9]+')![0]);

      if (!paramPath[index]) {
        continue;
      }

      const value =
        key === keywords.regexp || key === keywords.keyRegexp
          ? paramPath[index].replace(regexList.regexTokens, '\\$&')
          : paramPath[index];
      toReplace = toReplace.replace(new RegExp(`\\{\\{${index}\\}\\}`, 'g'), value);
    }

    return toReplace;
  };

  return recursiveSubstitute(specs, substitute, [keywords.conditions]);
}

/**
 * Calls provided substitute function on every key and string value in specs and replaces it with result of the function
 * @param specs - keys and string values of provided specification will be replaced with result of substitute function
 * @param substitute - function will be called with key or string value as a parameter, result of this function will replace original value in specification
 * @param ignoredKeys - list of keys, which will stop the recursion
 */
export function recursiveSubstitute(
  specs: any,
  substitute: (value: string, key?: string) => string,
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
      return { ...acc, [newKey]: substitute(specs[key], key) };
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
export function warnExtraFields(nonRedundant: any, specs: any, paramPath: string[]): Log[] {
  if (typeof specs !== 'object') {
    return [];
  }

  if (Array.isArray(specs)) {
    const messages: { level: 'warning' | 'error'; message: string }[] = [];

    paramPath.push('[0]');

    for (let i = 0; i < specs.length; i++) {
      if (nonRedundant[i] !== undefined) {
        paramPath[paramPath.length - 1] = `[${i}]`;
        messages.push(...warnExtraFields(nonRedundant[i], specs[i], paramPath));
      }
    }

    return messages;
  }

  return Object.keys(specs).reduce((acc: Log[], key) => {
    if (nonRedundant[keywords.noCheck]) {
      return acc;
    }

    if (nonRedundant[key] !== undefined) {
      return [...acc, ...warnExtraFields(nonRedundant[key], specs[key], [...paramPath, key])];
    }

    return [...acc, logger.warn(`Extra field: ${[...paramPath, key].join('.')}`)];
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
    keywords.arrayItem in (template[param] || {}) ||
    keywords.arrayItem in (template[keywords.objectItem] || {}) ||
    (keywords.any in (template[param] || {}) && Array.isArray(specs))
  ) {
    return [];
  }

  return {};
}

/**
 * Inserts value into specification inside specified parameter, creates missing parameters in parameter if they don't exist and merges parameter with value if both of them are objects
 * @param paramPath - full path to parameter
 * @param roots - roots of specs, nonRedundantParams, output
 * @param value - value that will be inserted
 */
export function insertValue(paramPath: string[], roots: Roots, value: any) {
  if (!paramPath.length) {
    roots.output = JSON.parse(JSON.stringify(value));
    return;
  }

  if (paramPath[0] === '[]') {
    roots.output = [];
  }

  insertValueRecursive(paramPath, roots.output, value);
}

function insertValueRecursive(paramPath: string[], spec: any, value: any) {
  let param = paramPath[0];

  if (param === '' || !param) {
    for (const key of Object.keys(value)) {
      spec[key] = JSON.parse(JSON.stringify(value[key]));
    }

    return;
  }

  if (param === keywords.all) {
    paramPath = paramPath.slice(1);

    if (Array.isArray(spec)) {
      spec.forEach((item) => {
        insertValueRecursive(paramPath, item, value);
      });
    } else {
      for (const key in spec) {
        insertValueRecursive(paramPath, spec[key], value);
      }
    }

    return;
  }

  if (param.match(regexList.convertorArrayOperation)) {
    let index = -1;

    if (param.match(regexList.arrayIndex)) {
      index = parseInt(param.match(regexList.arrayIndex)![1]);
    }

    if (param.match(/\[_\]$/)) {
      index = -2;
    }

    param = param.replace(regexList.convertorArrayOperation, '');

    if (param) {
      if (!spec[param]) {
        spec[param] = [];
      }

      spec = spec[param];
    }

    if (index === -2) {
      index = spec.length - 1;
    }

    if (index === -1) {
      index = spec.length;
    }

    if (spec.length <= index) {
      if (paramPath[1] === '' || !paramPath[1]) {
        spec.push(JSON.parse(JSON.stringify(value)));
        return;
      } else {
        spec.push({});
      }
    }

    spec = spec[index];

    insertValueRecursive(paramPath.slice(1), spec, value);
    return;
  }

  if (paramPath[paramPath.length - 1] === param) {
    spec[param] = JSON.parse(JSON.stringify(value));

    return;
  }

  if (!spec[param]) {
    spec[param] = {};
  }

  spec = spec[param];

  insertValueRecursive(paramPath.slice(1), spec, value);
}

/**
 * Returns object located on paramPath in specs
 * @param paramPath - path to parameter in specs that will be returned
 * @param specs - specification that will be searched for parameter
 * @param insertPath - won't return null if paramPath is not in the specs, but insert all missing parameters into specs
 * @returns object located on paramPath in specs or null if object does not exists in specs
 */
export function getSpecsFromPath(paramPath: string[], specs: { [k: string]: any }, insertPath = false): any {
  let paramName = paramPath[0];

  const indexMatches = paramName.match(regexList.arrayIndexOnly);

  if (indexMatches) {
    paramName = paramName.replace(`[${indexMatches[0]}]`, '');
  }

  const rootIsArray = !paramName.length && indexMatches && paramPath[0] === `[${indexMatches[0]}]`;

  if (!rootIsArray) {
    if (!(paramName in specs)) {
      if (!insertPath) {
        return null;
      }

      specs[paramName] = indexMatches ? [] : {};
    }

    specs = specs[paramName];
  }

  if (Array.isArray(specs) && indexMatches) {
    for (let i = specs.length; i <= parseInt(indexMatches[0]); i++) {
      specs.push({});
    }

    specs = specs[parseInt(indexMatches[0])];
  }

  paramPath = paramPath.slice(1);

  if (!paramPath.length) {
    return specs;
  }

  return getSpecsFromPath(paramPath, specs, insertPath);
}
