'use strict';

const fs = require('fs');
const helper = require('./validatorHelper');
const apiSpecs = JSON.parse(fs.readFileSync('specs/api.json', 'utf8'));
const oisSpecs = JSON.parse(fs.readFileSync('specs/ois.json', 'utf8'));
const endpointsSpecs = JSON.parse(fs.readFileSync('specs/endpoints.json', 'utf8'));

function findAnyValidParam(specs, specsRoot, specsStruct, paramPath, nonRedundantParams, nonRedundantParamsRoot) {
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

      let result = validateSpecs(specs[paramIndex], specsStruct, paramPath, specsRoot, nonRedundantParams[nonRedundantParams.length - 1], nonRedundantParamsRoot);

      if (!result.messages.length) {
        return true;
      }

      nonRedundantParams[paramIndex] = nonRedundantParamsCopy;
    }
  } else {
    for (const paramKey of Object.keys(specs)) {
      let nonRedundantParamsCopy = {};

      if (nonRedundantParams[paramKey]) {
        nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[paramKey]));
      } else {
        helper.insertNonRedundantParam(paramKey, specsStruct, nonRedundantParams, specs[paramKey]);
      }

      let result = validateSpecs(specs[paramKey], specsStruct, paramPath, specsRoot, nonRedundantParams[paramKey], nonRedundantParamsRoot);

      if (!result.messages.length) {
        return true;
      }

      nonRedundantParams[paramKey] = nonRedundantParamsCopy;
    }
  }

  return false;
}

function validateSpecs(specs, specsStruct, paramPath, specsRoot, nonRedundantParams, nonRedundantParamsRoot, paramPathPrefix = '') {
  let messages = [];
  let valid = true;
  let tmpNonRedundant = [];
  let tmpResult = {};

  for (const key of Object.keys(specsStruct)) {
    switch (key) {
      case '__conditions':
        for (const condition of specsStruct[key]) {
          if (condition['__if']) {
            const paramName = Object.keys(condition['__if'])[0];
            const paramValue = condition['__if'][paramName];
            const thenParamName = Object.keys(condition['__then'])[0];

            if (paramName === '__this') {
              for (const thisName of Object.keys(specs)) {
                if (!thisName) {
                  continue;
                }

                let matches = thisName.match(new RegExp(paramValue, 'g'));

                if (matches) {
                  for (let param of matches) {
                    let nonRedundantParamsCopy = {};
                    let parsedSpecs = helper.replaceConditionalMatch(param, condition['__then']);

                    if (nonRedundantParams[thisName]) {
                      nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[thisName]));
                    } else {
                      helper.insertNonRedundantParam(thisName, parsedSpecs, nonRedundantParams, specs[thisName]);
                    }

                    let result = validateSpecs(specs[thisName], parsedSpecs, `${paramPath}${paramPath ? '.' : ''}${thisName}`, specsRoot, nonRedundantParams[thisName], nonRedundantParamsRoot, paramPathPrefix);

                    if (!result.valid) {
                      if (Object.keys(nonRedundantParamsCopy).length) {
                        nonRedundantParams[thisName] = nonRedundantParamsCopy;
                      } else {
                        delete nonRedundantParams[thisName];
                      }

                      messages.push({ level: 'error', message: `Condition in ${paramPath}${paramPath ? '.' : ''}${thisName} is not met with ${param}` });
                      valid = false;
                    }
                  }
                }
              }
            } else if (specs[paramName]) {
              if (specs[paramName].match(new RegExp(paramValue))) {
                if (specs[thenParamName]) {
                  let nonRedundantParamsCopy = {};

                  if (nonRedundantParams[thenParamName]) {
                    nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[thenParamName]));
                  } else {
                    helper.insertNonRedundantParam(thenParamName, condition['__then'][thenParamName], nonRedundantParams, specs[thenParamName]);
                  }

                  if (!Object.keys(condition['__then'][thenParamName]).length) {
                    continue;
                  }

                  let result = validateSpecs(specs[thenParamName], condition['__then'][thenParamName], `${paramPath}${paramPath ? '.' : ''}${thenParamName}`, specsRoot, nonRedundantParams[thenParamName], nonRedundantParamsRoot, paramPathPrefix);
                  messages.push(...result.messages);

                  if (!result.valid) {
                    let keepRedundantParams = true;

                    for (let message of result.messages) {
                      if (message.message.startsWith('Missing parameter ')) {
                        keepRedundantParams = false;
                      }
                    }

                    if (!keepRedundantParams) {
                      if (Object.keys(nonRedundantParamsCopy).length) {
                        nonRedundantParams[thenParamName] = nonRedundantParamsCopy;
                      } else {
                        delete nonRedundantParams[thenParamName];
                      }
                    }

                    valid = false;
                  }
                } else if (thenParamName === '__any') {
                  if (!findAnyValidParam(specs, specsRoot, condition['__then']['__any'], paramPath, nonRedundantParams, nonRedundantParamsRoot)) {
                    messages.push({ level: 'error', message: `Required conditions not met in ${paramPath}`});
                    valid = false;
                  }
                } else {
                  valid = false;
                  messages.push({ level: 'error', message: `Missing parameter ${paramPath}${(paramPath && thenParamName) ? '.' : ''}${thenParamName}`});
                }
              }
            }
          } else if (condition['__require']) {
            for (let requiredParam of Object.keys(condition['__require'])) {
              let workingDir = specs;
              let requiredPath = '';
              let currentDir = paramPath;
              let nonRedundantWD = nonRedundantParams;

              let thisName = helper.getLastParamName(paramPath);
              requiredParam = requiredParam.replace(/__this_name/g, thisName);

              if (requiredParam[0] === '/') {
                requiredParam = requiredParam.slice(1);
                workingDir = specsRoot;
                currentDir = '';
                nonRedundantWD = nonRedundantParamsRoot;
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
                  valid = false;
                  messages.push({ level: 'error', message: `Missing parameter ${paramPathPrefix ? `${paramPathPrefix}.` : ''}${currentDir}${(currentDir && requiredPath) ? '.' : ''}${requiredPath}`});
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
                    valid = false;
                    messages.push({ level: 'error', message: `Array out of bounds, attempted to access element on index ${index} in ${paramPathPrefix ? `${paramPathPrefix}.` : ''}${currentDir}`}, paramPathPrefix);
                    break;
                  }

                  workingDir = workingDir[index];

                  nonRedundantWD.push({});
                  nonRedundantWD = nonRedundantWD[nonRedundantWD.size() - 1];
                }
              }
            }
          }
        }

        break;

      case '__regexp':
        if (typeof specs !== 'string' || !specs.match(new RegExp(specsStruct[key]))) {
          let level = 'warning';

          if (specsStruct['__level']) {
            level = specsStruct['__level'];

            if (level === 'error') {
              valid = false;
            }
          }

          messages.push({ level, message: `${paramPath} is not formatted correctly` });
        }

        break;

      case '__keyRegexp':
        for (const item of Object.keys(specs)) {
          if (!item.match(new RegExp(specsStruct[key]))) {
            messages.push({ level: 'error', message: `Key ${item} in ${paramPath}${paramPath ? '.' : ''}${item} is formatted incorrectly` });
          }
        }

        break;

      case '__maxSize':
        if (specsStruct[key] < specs.length) {
          messages.push({ level: 'error', message: `${paramPath} must contain ${specsStruct[key]} or less items` });
          valid = false;
        }

        break;

      case '__arrayItem':
        if (!nonRedundantParams) {
          nonRedundantParams = [];
        }

        for (let i = 0; i < specs.length; i++) {
          nonRedundantParams.push({});
          let result = validateSpecs(specs[i], specsStruct[key], `${paramPath}[${i}]`, specsRoot, nonRedundantParams[i], nonRedundantParamsRoot, paramPathPrefix);
          messages.push(...result.messages);

          if (!result.valid) {
            valid = false;
          }
        }

        break;

      case '__objectItem':
        for (const item of Object.keys(specs)) {
          helper.insertNonRedundantParam(item, specsStruct, nonRedundantParams, specs[item]);

          let result = validateSpecs(specs[item], specsStruct[key], `${paramPath}${paramPath ? '.' : ''}${item}`, specsRoot, nonRedundantParams[item], nonRedundantParamsRoot, paramPathPrefix);
          messages.push(...result.messages);

          if (!result.valid) {
            valid = false;
          }
        }

        break;

      case '__optional':
        for (const optionalItem of Object.keys(specsStruct[key])) {
          for (const item of Object.keys(specs)) {
            if (item === optionalItem) {
              helper.insertNonRedundantParam(item, specsStruct[key], nonRedundantParams, specs[item]);

              let result = validateSpecs(specs[item], specsStruct[key][item], `${paramPath}${paramPath ? '.' : ''}${item}`, specsRoot, nonRedundantParams[item], nonRedundantParamsRoot, paramPathPrefix);
              messages.push(...result.messages);

              if (!result.valid) {
                valid = false;
              }
            }
          }
        }

        break;

      case '__level':
        break;

      case '__any':
        if (!findAnyValidParam(specs, specsRoot, specsStruct[key], paramPath, nonRedundantParams, nonRedundantParamsRoot)) {
          messages.push({ level: 'error', message: `Required conditions not met in ${paramPath}`});
          valid = false;
        }

        break;

      case '__apiSpecs':
        tmpNonRedundant = {};
        tmpResult = validateSpecs(specs, apiSpecs, paramPath, specs, tmpNonRedundant, tmpNonRedundant, paramPath);
        messages.push(...tmpResult.messages);

        if (!tmpResult.valid) {
          valid = false;
        }

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__endpointsSpecs':
        tmpNonRedundant = [];
        tmpResult = validateSpecs(specs, endpointsSpecs, paramPath, specs, tmpNonRedundant, tmpNonRedundant, paramPath);
        messages.push(...tmpResult.messages);

        if (!tmpResult.valid) {
          valid = false;
        }

        nonRedundantParams['__noCheck'] = {};

        break;

      default:
        if (!specs[key]) {
          messages.push({ level: 'error', message: `Missing parameter ${paramPath}${(paramPath && key) ? '.' : ''}${key}`});
          valid = false;

          continue;
        }

        helper.insertNonRedundantParam(key, specsStruct, nonRedundantParams, specs[key]);

        if (!Object.keys(specsStruct[key]).length) {
          continue;
        }

        tmpResult = validateSpecs(specs[key], specsStruct[key], `${paramPath}${paramPath ? '.' : ''}${key}`, specsRoot, nonRedundantParams[key], nonRedundantParamsRoot, paramPathPrefix);
        messages.push(...tmpResult.messages);

        if (!tmpResult.valid) {
          valid = false;
        }

        break;
    }
  }

  if (specs === specsRoot) {
    messages.push(...helper.warnExtraFields(nonRedundantParamsRoot, specs, paramPath));
  }

  return { valid, messages };
}

function isApiSpecsValid(specs) {
  let parsedSpecs;
  let nonRedundant = {};

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return validateSpecs(parsedSpecs, apiSpecs, '', parsedSpecs, nonRedundant, nonRedundant);
}

function isEndpointsValid(specs) {
  let parsedSpecs;
  let nonRedundant = [];

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return validateSpecs(parsedSpecs, endpointsSpecs, '', parsedSpecs, nonRedundant, nonRedundant);
}

function isOisValid(specs) {
  let parsedSpecs;
  let nonRedundant = {};

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return validateSpecs(parsedSpecs, oisSpecs, '', parsedSpecs, nonRedundant, nonRedundant);
}

module.exports = { isApiSpecsValid, isEndpointsValid, isOisValid };
