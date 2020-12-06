import { validateSpecs } from '../validator';
import { isAnyParamValid } from './anyValidator';
import * as logger from '../utils/logger';
import * as utils from '../utils/utils';
import { Roots, Log } from '../types';

/**
 * Validates "if" condition in which regular expression is matched against the key in specification
 * @param specs - specification containing objects with keys that will be matched with regular expression
 * @param condition - object containing the regular expression and validator structure, which will be validated in case the regular expression is matched
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs and nonRedundantParams
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
function validateConditionRegexInKey(
  specs: any,
  condition: any,
  nonRedundantParams: any,
  paramPath: string,
  roots: Roots,
  paramPathPrefix: string
): Log[] {
  const messages: Log[] = [];
  const paramName = Object.keys(condition['__if'])[0];
  const paramValue = condition['__if'][paramName];

  // In case of '__rootThen' validate from root
  const thenCondition = condition['__rootThen'] ? condition['__rootThen'] : condition['__then'];
  const currentNonRedundantParams = condition['__rootThen'] ? roots.nonRedundantParams : nonRedundantParams;
  const currentTemplate = condition['__rootThen'] ? roots.specs : specs;
  const currentParamPath = condition['__rootThen'] ? paramPathPrefix : paramPath;

  // check all keys of children for a match with provided regex
  for (const thisName of Object.keys(specs)) {
    const matches = thisName.match(new RegExp(paramValue, 'g'));

    if (!matches) {
      continue;
    }

    // key matched regex, this means "if section" of the condition is fulfilled so structure in "then section" must be present
    for (const param of matches) {
      let nonRedundantParamsCopy = {};
      const template = utils.replaceConditionalMatch(param, thenCondition);

      // create copy of nonRedundantParams, so in case "then section" had errors it can be restored to previous state
      if (currentNonRedundantParams[thisName]) {
        nonRedundantParamsCopy = JSON.parse(JSON.stringify(currentNonRedundantParams[thisName]));
      } else {
        currentNonRedundantParams[thisName] = utils.getEmptyNonRedundantParam(
          thisName,
          template,
          currentNonRedundantParams,
          currentTemplate[thisName]
        );
      }

      const result = validateSpecs(
        currentTemplate[thisName],
        template,
        `${currentParamPath}${currentParamPath ? '.' : ''}${thisName}`,
        currentNonRedundantParams[thisName],
        roots
      );

      if (result.messages.some((msg) => msg.level === 'error')) {
        // validateSpecs ended with errors => correct "then section" is not present in specs
        // returning nonRedundantParams to original state, because some parameters might be extra if nothing else requires them
        if (Object.keys(nonRedundantParamsCopy).length) {
          currentNonRedundantParams[thisName] = nonRedundantParamsCopy;
        } else {
          delete currentNonRedundantParams[thisName];
        }

        messages.push(
          logger.error(`Condition in ${paramPath}${paramPath ? '.' : ''}${thisName} is not met with ${param}`)
        );
      }
    }
  }

  return messages;
}

/**
 * Validates "if" condition in which regular expression is matched against the value in specification
 * @param specs - specification containing objects with keys that will be matched with regular expression
 * @param condition - object containing the regular expression and template, which will be validated in case the regular expression is matched
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs and nonRedundantParams
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
function validateConditionRegexInValue(
  specs: any,
  condition: any,
  nonRedundantParams: any,
  paramPath: string,
  roots: Roots,
  paramPathPrefix: string
): Log[] {
  const messages: Log[] = [];
  const paramName = Object.keys(condition['__if'])[0];
  const paramValue = condition['__if'][paramName];

  // In case of '__rootThen' validate from root
  let thenCondition = condition['__rootThen'] ? condition['__rootThen'] : condition['__then'];
  const currentNonRedundantParams = condition['__rootThen'] ? roots.nonRedundantParams : nonRedundantParams;
  const currentTemplate = condition['__rootThen'] ? roots.specs : specs;
  const currentParamPath = condition['__rootThen'] ? paramPathPrefix : paramPath;
  const thenParamName = Object.keys(thenCondition)[0];

  if (paramName === '__this') {
    if (!specs.match(new RegExp(paramValue))) {
      return [];
    }

    thenCondition = utils.replaceConditionalMatch(specs, thenCondition);
  } else if (!specs[paramName].match(new RegExp(paramValue))) {
    return [];
  }

  // parameter value matched regex, "then section" must be checked

  /*
   "then section" might either contain a parameter with key thats present in specs or
   parameter with key "__any", which means every parameter in specs must be checked and if at least one parameter matches "then section" the condition is fulfilled,
   otherwise the required parameter is missing in specs and condition is not fulfilled
  */
  if (thenParamName === '__any') {
    if (!isAnyParamValid(currentTemplate, thenCondition['__any'], currentParamPath, currentNonRedundantParams, roots)) {
      messages.push(logger.error(`Required conditions not met in ${paramPath}`));
    }

    return messages;
  }

  if (!currentTemplate[thenParamName]) {
    messages.push(
      logger.error(
        `Missing parameter ${currentParamPath}${currentParamPath && thenParamName ? '.' : ''}${thenParamName}`
      )
    );

    return messages;
  }

  let nonRedundantParamsCopy = {};

  // create copy of nonRedundantParams, so in case "then section" had errors it can be restored to previous state
  if (currentNonRedundantParams[thenParamName]) {
    nonRedundantParamsCopy = JSON.parse(JSON.stringify(currentNonRedundantParams[thenParamName]));
  } else {
    currentNonRedundantParams[thenParamName] = utils.getEmptyNonRedundantParam(
      thenParamName,
      thenCondition[thenParamName],
      currentNonRedundantParams,
      currentTemplate[thenParamName]
    );
  }

  if (!Object.keys(thenCondition[thenParamName]).length) {
    return [];
  }

  const result = validateSpecs(
    currentTemplate[thenParamName],
    thenCondition[thenParamName],
    `${currentParamPath}${currentParamPath ? '.' : ''}${thenParamName}`,
    currentNonRedundantParams[thenParamName],
    roots
  );

  if (!result.messages.some((msg) => msg.level === 'error')) {
    if (!nonRedundantParams[paramName]) {
      nonRedundantParams[paramName] = {};
    }

    return result.messages;
  }

  messages.push(...result.messages);
  let keepRedundantParams = true;

  // if a parameter from "then section" is missing in specs, this part of specs will be considered as extra params if nothing else requires them
  for (const message of result.messages) {
    if (message.message.startsWith('Missing parameter ')) {
      keepRedundantParams = false;
    }
  }

  if (!keepRedundantParams) {
    // returning nonRedundantParams to original state, since it wasn't used in "then section" of condition
    if (Object.keys(nonRedundantParamsCopy).length) {
      currentNonRedundantParams[thenParamName] = nonRedundantParamsCopy;
    } else {
      delete currentNonRedundantParams[thenParamName];
    }
  } else if (!nonRedundantParams[paramName]) {
    nonRedundantParams[paramName] = {};
  }

  return messages;
}

/**
 * Validates "require" condition in which a certain structure is required to be present in specification
 * @param specs - specification that is being validated
 * @param condition - object containing the template that needs to be present in specification
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs and nonRedundantParams
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
function validateConditionRequires(
  specs: any,
  condition: any,
  nonRedundantParams: any,
  paramPath: string,
  roots: Roots,
  paramPathPrefix: string
): Log[] {
  const messages: Log[] = [];

  for (let requiredParam of Object.keys(condition['__require'])) {
    let workingDir = specs;
    let requiredPath = '';
    let currentDir = paramPath;
    let nonRedundantWD = nonRedundantParams;

    const thisName = utils.getLastParamName(paramPath);
    requiredParam = requiredParam.replace(/__this_name/g, thisName);

    if (requiredParam[0] === '/') {
      requiredParam = requiredParam.slice(1);
      workingDir = roots.specs;
      currentDir = '';
      nonRedundantWD = roots.nonRedundantParams;
    }

    requiredPath = requiredParam;

    while (requiredPath.length) {
      const dotIndex = requiredPath.indexOf('.');
      let paramName = requiredPath;

      if (dotIndex > 0) {
        paramName = requiredPath.substr(0, dotIndex);
      }

      currentDir = `${currentDir}${currentDir ? '.' : ''}${paramName}`;
      requiredPath = requiredPath.replace(paramName, '');

      if (requiredPath.startsWith('.')) {
        requiredPath = requiredPath.replace('.', '');
      }

      let index = 0;
      const indexMatches = paramName.match(/(?<=\[)[\d]+(?=])/);

      if (indexMatches && indexMatches.length) {
        index = parseInt(indexMatches[0]);
      }

      if (!workingDir[paramName]) {
        messages.push(
          logger.error(
            `Missing parameter ${paramPathPrefix ? `${paramPathPrefix}.` : ''}${currentDir}${
              currentDir && requiredPath ? '.' : ''
            }${requiredPath}`
          )
        );

        break;
      }

      if (!nonRedundantWD[paramName]) {
        if (typeof workingDir === 'object') {
          nonRedundantWD[paramName] = Array.isArray(workingDir[paramName]) ? [] : {};
        } else {
          nonRedundantWD[paramName] = {};
        }
      }

      nonRedundantWD = nonRedundantWD[paramName];
      workingDir = workingDir[paramName];

      if (index) {
        if (!workingDir[index]) {
          messages.push(
            logger.error(
              `Array out of bounds, attempted to access element on index ${index} in ${
                paramPathPrefix ? `${paramPathPrefix}.` : ''
              }${currentDir}`
            )
          );

          break;
        }

        workingDir = workingDir[index];

        nonRedundantWD.push({});
        nonRedundantWD = nonRedundantWD[nonRedundantWD.size() - 1];
      }
    }
  }

  return messages;
}

/**
 * Validates "if" and "require" conditions in template against provided specification
 * @param specs - specification that is being validated
 * @param condition - template of conditions that the specification will be checked against
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs and nonRedundantParams
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function validateCondition(
  specs: any,
  condition: any,
  nonRedundantParams: any,
  paramPath: string,
  roots: Roots,
  paramPathPrefix: string
): Log[] {
  const messages: Log[] = [];

  if (condition['__require']) {
    // condition is require condition
    messages.push(
      ...validateConditionRequires(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix)
    );

    return messages;
  }

  // condition is if, then condition
  const paramName = Object.keys(condition['__if'])[0];

  if (paramName === '__this_name') {
    messages.push(
      ...validateConditionRegexInKey(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix)
    );
  } else if (specs[paramName] || paramName === '__this') {
    messages.push(
      ...validateConditionRegexInValue(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix)
    );
  }

  return messages;
}
