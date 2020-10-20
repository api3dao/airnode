'use strict';

const fs = require('fs');
const utils = require('./utils');
const logger = require('./logger');
const apiSpecs = JSON.parse(fs.readFileSync('specs/api.json', 'utf8'));
const oisSpecs = JSON.parse(fs.readFileSync('specs/ois.json', 'utf8'));
const endpointsSpecs = JSON.parse(fs.readFileSync('specs/endpoints.json', 'utf8'));

/*
checks if at least one child in specs conforms specsStruct
 */
function findAnyValidParam(specs, specsStruct, paramPath, nonRedundantParams, roots) {
  if (!specs) {
    return false;
  }

  if (Array.isArray(specs)) {
    for (let paramIndex = 0; paramIndex < specs.length; paramIndex++) {
      let nonRedundantParamsCopy = {};

      if (nonRedundantParams[paramIndex]) {
        nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[paramIndex]));
      } else {
        nonRedundantParams.push({});
      }

      let result = validateSpecs(
        specs[paramIndex],
        specsStruct,
        paramPath,
        nonRedundantParams[nonRedundantParams.length - 1],
        roots
      );

      if (!result.messages.length) {
        return true;
      }

      nonRedundantParams[paramIndex] = nonRedundantParamsCopy;
    }

    return false;
  } else {
    for (const paramKey of Object.keys(specs)) {
      let nonRedundantParamsCopy = {};

      if (nonRedundantParams[paramKey]) {
        nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[paramKey]));
      } else {
        nonRedundantParams[paramKey] = utils.getEmptyNonRedundantParam(
          paramKey,
          specsStruct,
          nonRedundantParams,
          specs[paramKey]
        );
      }

      let result = validateSpecs(specs[paramKey], specsStruct, paramPath, nonRedundantParams[paramKey], roots);

      if (!result.messages.length) {
        return true;
      }

      nonRedundantParams[paramKey] = nonRedundantParamsCopy;
    }
  }

  return false;
}

/*
validates if condition that might have matches inside the parameter key
used for example in api specs paths, in which parameters are present inside curly braces directly in the name of path
 */
function validateConditionRegexInKey(specs, condition, nonRedundantParams, paramPath, roots) {
  let messages = [];
  const paramName = Object.keys(condition['__if'])[0];
  const paramValue = condition['__if'][paramName];

  // check all keys of children for a match with provided regex
  for (const thisName of Object.keys(specs)) {
    let matches = thisName.match(new RegExp(paramValue, 'g'));

    if (!matches) {
      continue;
    }

    // key matched regex, this means "if section" of the condition is fulfilled so structure in "then section" must be present
    for (let param of matches) {
      let nonRedundantParamsCopy = {};
      let parsedSpecs = utils.replaceConditionalMatch(param, condition['__then']);

      // create copy of nonRedundantParams, so in case "then section" had errors it can be restored to previous state
      if (nonRedundantParams[thisName]) {
        nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[thisName]));
      } else {
        nonRedundantParams[thisName] = utils.getEmptyNonRedundantParam(
          thisName,
          parsedSpecs,
          nonRedundantParams,
          specs[thisName]
        );
      }

      let result = validateSpecs(
        specs[thisName],
        parsedSpecs,
        `${paramPath}${paramPath ? '.' : ''}${thisName}`,
        nonRedundantParams[thisName],
        roots
      );

      if (result.messages.some((msg) => msg.level === 'error')) {
        // validateSpecs ended with errors => correct "then section" is not present in specs
        // returning nonRedundantParams to original state, because some parameters might be extra if nothing else requires them
        if (Object.keys(nonRedundantParamsCopy).length) {
          nonRedundantParams[thisName] = nonRedundantParamsCopy;
        } else {
          delete nonRedundantParams[thisName];
        }

        messages.push(
          logger.error(`Condition in ${paramPath}${paramPath ? '.' : ''}${thisName} is not met with ${param}`)
        );
      }
    }
  }

  return messages;
}

/*
in case value of specs[paramName] matches provided regex, checks if structure in "then section" is present in specs
 */
function validateConditionRegexInValue(specs, condition, nonRedundantParams, paramPath, roots) {
  let messages = [];
  const paramName = Object.keys(condition['__if'])[0];
  const paramValue = condition['__if'][paramName];
  const thenParamName = Object.keys(condition['__then'])[0];

  if (!specs[paramName].match(new RegExp(paramValue))) {
    return [];
  }

  // parameter value matched regex, "then section" must be checked

  /*
   "then section" might either contain a parameter with key thats present in specs or
   parameter with key "__any", which means every parameter in specs must be checked and if at least one parameter matches "then section" the condition is fulfilled,
   otherwise the required parameter is missing in specs and condition is not fulfilled
  */
  if (specs[thenParamName]) {
    let nonRedundantParamsCopy = {};

    // create copy of nonRedundantParams, so in case "then section" had errors it can be restored to previous state
    if (nonRedundantParams[thenParamName]) {
      nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[thenParamName]));
    } else {
      nonRedundantParams[thenParamName] = utils.getEmptyNonRedundantParam(
        thenParamName,
        condition['__then'][thenParamName],
        nonRedundantParams,
        specs[thenParamName]
      );
    }

    if (!Object.keys(condition['__then'][thenParamName]).length) {
      return [];
    }

    let result = validateSpecs(
      specs[thenParamName],
      condition['__then'][thenParamName],
      `${paramPath}${paramPath ? '.' : ''}${thenParamName}`,
      nonRedundantParams[thenParamName],
      roots
    );

    if (!result.messages.some((msg) => msg.level === 'error')) {
      return [];
    }

    messages.push(...result.messages);
    let keepRedundantParams = true;

    // if a parameter from "then section" is missing in specs, this part of specs will be considered as extra params if nothing else requires them
    for (let message of result.messages) {
      if (message.message.startsWith('Missing parameter ')) {
        keepRedundantParams = false;
      }
    }

    if (!keepRedundantParams) {
      // returning nonRedundantParams to original state, since it wasn't used in "then section" of condition
      if (Object.keys(nonRedundantParamsCopy).length) {
        nonRedundantParams[thenParamName] = nonRedundantParamsCopy;
      } else {
        delete nonRedundantParams[thenParamName];
      }
    }
  } else if (thenParamName === '__any') {
    if (!findAnyValidParam(specs, condition['__then']['__any'], paramPath, nonRedundantParams, roots)) {
      messages.push(logger.error(`Required conditions not met in ${paramPath}`));
    }
  } else {
    messages.push(
      logger.error(`Missing parameter ${paramPath}${paramPath && thenParamName ? '.' : ''}${thenParamName}`)
    );
  }

  return messages;
}

function validateConditionRequires(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix) {
  let messages = [];

  for (let requiredParam of Object.keys(condition['__require'])) {
    let workingDir = specs;
    let requiredPath = '';
    let currentDir = paramPath;
    let nonRedundantWD = nonRedundantParams;

    let thisName = utils.getLastParamName(paramPath);
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
      let indexMatches = paramName.match(/(?<=\[)[\d]+(?=])/);

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

function validateCondition(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix) {
  let messages = [];

  if (condition['__require']) {
    // condition is require condition
    messages.push(
      ...validateConditionRequires(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix)
    );

    return messages;
  }

  // condition is if, then condition
  const paramName = Object.keys(condition['__if'])[0];

  if (paramName === '__this') {
    messages.push(...validateConditionRegexInKey(specs, condition, nonRedundantParams, paramPath, roots));
  } else if (specs[paramName]) {
    messages.push(...validateConditionRegexInValue(specs, condition, nonRedundantParams, paramPath, roots));
  }

  return messages;
}

// checks if key or value (depends on isKeyRegexp) matches regular expression in specsStruct
function validateRegexp(specs, specsStruct, paramPath, isKeyRegexp = false) {
  let messages = [];

  if (isKeyRegexp) {
    for (const item of Object.keys(specs)) {
      if (!item.match(new RegExp(specsStruct['__keyRegexp']))) {
        messages.push(
          logger.error(`Key ${item} in ${paramPath}${paramPath ? '.' : ''}${item} is formatted incorrectly`)
        );
      }
    }

    return messages;
  }

  if (typeof specs !== 'string' || !specs.match(new RegExp(specsStruct['__regexp']))) {
    const level = specsStruct['__level'] || 'warning';
    const message = `${paramPath} is not formatted correctly`;

    messages.push(level === 'error' ? logger.error(message) : logger.warn(message));
  }

  return messages;
}

// validates optional parameters
function validateOptional(specs, specsStruct, paramPath, nonRedundantParams, roots, paramPathPrefix) {
  let messages = [];

  for (const optionalItem of Object.keys(specsStruct)) {
    for (const item of Object.keys(specs)) {
      // in the specs might be other parameters, only the optional ones are validated here
      if (item === optionalItem) {
        nonRedundantParams[item] = utils.getEmptyNonRedundantParam(item, specsStruct, nonRedundantParams, specs[item]);

        let result = validateSpecs(
          specs[item],
          specsStruct[item],
          `${paramPath}${paramPath ? '.' : ''}${item}`,
          nonRedundantParams[item],
          roots,
          paramPathPrefix
        );
        messages.push(...result.messages);
      }
    }
  }

  return messages;
}

function validateSpecs(specs, specsStruct, paramPath, nonRedundantParams, roots, paramPathPrefix = '') {
  let messages = [];
  let tmpNonRedundant = [];
  let tmpResult = {};
  let tmpRoots = {};

  for (const key of Object.keys(specsStruct)) {
    switch (key) {
      case '__conditions':
        for (const condition of specsStruct[key]) {
          messages.push(...validateCondition(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix));
        }

        break;

      case '__regexp':
        messages.push(...validateRegexp(specs, specsStruct, paramPath));
        break;

      case '__keyRegexp':
        messages.push(...validateRegexp(specs, specsStruct, paramPath, true));
        break;

      case '__maxSize':
        if (specsStruct[key] < specs.length) {
          messages.push(logger.error(`${paramPath} must contain ${specsStruct[key]} or less items`));
        }

        break;

      // validate array
      case '__arrayItem':
        // nonRedundantParams has to have the same structure as specsStruct
        if (!nonRedundantParams) {
          nonRedundantParams = [];
        }

        // validate each item in specs
        for (let i = 0; i < specs.length; i++) {
          nonRedundantParams.push({});
          let result = validateSpecs(
            specs[i],
            specsStruct[key],
            `${paramPath}[${i}]`,
            nonRedundantParams[i],
            roots,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      // in specs can be any parameter, should validate all of them according to whats in the specsStruct
      case '__objectItem':
        for (const item of Object.keys(specs)) {
          // insert empty type of item into nonRedundantParams
          nonRedundantParams[item] = utils.getEmptyNonRedundantParam(
            item,
            specsStruct,
            nonRedundantParams,
            specs[item]
          );

          let result = validateSpecs(
            specs[item],
            specsStruct[key],
            `${paramPath}${paramPath ? '.' : ''}${item}`,
            nonRedundantParams[item],
            roots,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      case '__optional':
        messages.push(
          ...validateOptional(specs, specsStruct[key], paramPath, nonRedundantParams, roots, paramPathPrefix)
        );

        break;

      // determines level of message for single parameter, currently used only in regexp validation
      case '__level':
        break;

      case '__any':
        if (!findAnyValidParam(specs, specsStruct[key], paramPath, nonRedundantParams, roots)) {
          messages.push(logger.error(`Required conditions not met in ${paramPath}`));
        }

        break;

      case '__apiSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, apiSpecs, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__endpointsSpecs':
        tmpNonRedundant = [];
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, endpointsSpecs, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      // key is not a special keyword, but a regular parameter
      default:
        if (!specs[key]) {
          messages.push(logger.error(`Missing parameter ${paramPath}${paramPath && key ? '.' : ''}${key}`));

          continue;
        }

        nonRedundantParams[key] = utils.getEmptyNonRedundantParam(key, specsStruct, nonRedundantParams, specs[key]);

        if (!Object.keys(specsStruct[key]).length) {
          continue;
        }

        tmpResult = validateSpecs(
          specs[key],
          specsStruct[key],
          `${paramPath}${paramPath ? '.' : ''}${key}`,
          nonRedundantParams[key],
          roots,
          paramPathPrefix
        );
        messages.push(...tmpResult.messages);

        break;
    }
  }

  let valid = true;

  if (specs === roots.specs) {
    messages.push(...utils.warnExtraFields(roots.nonRedundantParams, specs, paramPath));
    valid = !messages.some((msg) => msg.level === 'error');
  }

  return { valid, messages };
}

function isApiSpecsValid(specs) {
  let nonRedundant = {};

  try {
    const parsedSpecs = JSON.parse(specs);
    return validateSpecs(parsedSpecs, apiSpecs, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

function isEndpointsValid(specs) {
  let nonRedundant = [];

  try {
    const parsedSpecs = JSON.parse(specs);
    return validateSpecs(parsedSpecs, endpointsSpecs, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

function isOisValid(specs) {
  let nonRedundant = {};

  try {
    const parsedSpecs = JSON.parse(specs);
    return validateSpecs(parsedSpecs, oisSpecs, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

module.exports = { isApiSpecsValid, isEndpointsValid, isOisValid };
