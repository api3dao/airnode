'use strict';

const fs = require('fs');
const utils = require('./utils');
const logger = require('./logger');
const apiSpecs = JSON.parse(fs.readFileSync('specs/api.json', 'utf8'));
const oisSpecs = JSON.parse(fs.readFileSync('specs/ois.json', 'utf8'));
const endpointsSpecs = JSON.parse(fs.readFileSync('specs/endpoints.json', 'utf8'));

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

function validateSpecs(specs, specsStruct, paramPath, nonRedundantParams, roots, paramPathPrefix = '') {
  let messages = [];
  let tmpNonRedundant = [];
  let tmpResult = {};
  let tmpRoots = {};

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
                    let parsedSpecs = utils.replaceConditionalMatch(param, condition['__then']);

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
                      roots,
                      paramPathPrefix
                    );

                    if (result.messages.some((msg) => msg.level === 'error')) {
                      if (Object.keys(nonRedundantParamsCopy).length) {
                        nonRedundantParams[thisName] = nonRedundantParamsCopy;
                      } else {
                        delete nonRedundantParams[thisName];
                      }

                      messages.push(
                        logger.error(
                          `Condition in ${paramPath}${paramPath ? '.' : ''}${thisName} is not met with ${param}`
                        )
                      );
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
                    nonRedundantParams[thenParamName] = utils.getEmptyNonRedundantParam(
                      thenParamName,
                      condition['__then'][thenParamName],
                      nonRedundantParams,
                      specs[thenParamName]
                    );
                  }

                  if (!Object.keys(condition['__then'][thenParamName]).length) {
                    continue;
                  }

                  let result = validateSpecs(
                    specs[thenParamName],
                    condition['__then'][thenParamName],
                    `${paramPath}${paramPath ? '.' : ''}${thenParamName}`,
                    nonRedundantParams[thenParamName],
                    roots,
                    paramPathPrefix
                  );
                  messages.push(...result.messages);

                  if (result.messages.some((msg) => msg.level === 'error')) {
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
                  }
                } else if (thenParamName === '__any') {
                  if (!findAnyValidParam(specs, condition['__then']['__any'], paramPath, nonRedundantParams, roots)) {
                    messages.push(logger.error(`Required conditions not met in ${paramPath}`));
                  }
                } else {
                  messages.push(
                    logger.error(
                      `Missing parameter ${paramPath}${paramPath && thenParamName ? '.' : ''}${thenParamName}`
                    )
                  );
                }
              }
            }
          } else if (condition['__require']) {
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
          }
        }

        break;

      case '__regexp':
        if (typeof specs !== 'string' || !specs.match(new RegExp(specsStruct[key]))) {
          let level = 'warning';

          if (specsStruct['__level']) {
            level = specsStruct['__level'];
          }

          if (level === 'error') {
            messages.push(logger.error(`${paramPath} is not formatted correctly`));
          } else {
            messages.push(logger.warn(`${paramPath} is not formatted correctly`));
          }
        }

        break;

      case '__keyRegexp':
        for (const item of Object.keys(specs)) {
          if (!item.match(new RegExp(specsStruct[key]))) {
            messages.push(
              logger.error(`Key ${item} in ${paramPath}${paramPath ? '.' : ''}${item} is formatted incorrectly`)
            );
          }
        }

        break;

      case '__maxSize':
        if (specsStruct[key] < specs.length) {
          messages.push(logger.error(`${paramPath} must contain ${specsStruct[key]} or less items`));
        }

        break;

      case '__arrayItem':
        if (!nonRedundantParams) {
          nonRedundantParams = [];
        }

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

      case '__objectItem':
        for (const item of Object.keys(specs)) {
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
        for (const optionalItem of Object.keys(specsStruct[key])) {
          for (const item of Object.keys(specs)) {
            if (item === optionalItem) {
              nonRedundantParams[item] = utils.getEmptyNonRedundantParam(
                item,
                specsStruct[key],
                nonRedundantParams,
                specs[item]
              );

              let result = validateSpecs(
                specs[item],
                specsStruct[key][item],
                `${paramPath}${paramPath ? '.' : ''}${item}`,
                nonRedundantParams[item],
                roots,
                paramPathPrefix
              );
              messages.push(...result.messages);
            }
          }
        }

        break;

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
  let parsedSpecs;
  let nonRedundant = {};

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  let roots = { specs: parsedSpecs, nonRedundantParams: nonRedundant };

  return validateSpecs(parsedSpecs, apiSpecs, '', nonRedundant, roots);
}

function isEndpointsValid(specs) {
  let parsedSpecs;
  let nonRedundant = [];

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  const roots = { specs: parsedSpecs, nonRedundantParams: nonRedundant };

  return validateSpecs(parsedSpecs, endpointsSpecs, '', nonRedundant, roots);
}

function isOisValid(specs) {
  let parsedSpecs;
  let nonRedundant = {};

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  const roots = { specs: parsedSpecs, nonRedundantParams: nonRedundant };

  return validateSpecs(parsedSpecs, oisSpecs, '', nonRedundant, roots);
}

module.exports = { isApiSpecsValid, isEndpointsValid, isOisValid };
