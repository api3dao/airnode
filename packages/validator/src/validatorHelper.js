'use strict';

function getLastParamName(paramPath) {
  const lastDotIndex = paramPath.lastIndexOf('.');
  let paramName = paramPath;

  if (lastDotIndex >= 0) {
    paramName = paramPath.slice(lastDotIndex + 1);
  }

  return paramName;
}

function replaceConditionalMatch(match, specs) {
  let parsedSpecs = {};

  for (const key of Object.keys(specs)) {
    if (key === '__conditions') {
      continue;
    }

    let newKey = key.replace(/__match/g, match);
    parsedSpecs[newKey] = typeof specs[key] === 'string' ? specs[key].replace(/__match/g, match) : replaceConditionalMatch(match, specs[key]);
  }

  return parsedSpecs;
}

function checkRedundancy(nonRedundant, specs, paramPath, messages) {
  if (typeof specs === 'object') {
    if (Array.isArray(specs)) {
      for (let i = 0; i < specs.length; i++) {
        if (nonRedundant[i]) {
          checkRedundancy(nonRedundant[i], specs[i], `${paramPath}[${i}]`, messages);
        }
      }
    } else {
      for (let param of Object.keys(specs)) {
        if (nonRedundant[param]) {
          checkRedundancy(nonRedundant[param], specs[param], `${paramPath}${paramPath ? '.' : ''}${param}`, messages);
        } else {
          if (Object.keys(nonRedundant).includes('__noCheck')) {
            continue;
          }

          messages.push({ level: 'warning', message: `Extra field: ${paramPath}${paramPath ? '.' : ''}${param}` });
        }
      }
    }
  }
}

function insertNonRedundantParam(param, specsStruct, nonRedundantParams, specs) {
  if (!nonRedundantParams[param]) {
    if (typeof specsStruct === 'object' && typeof specsStruct[param] === 'object') {
      if ('__arrayItem' in (specsStruct[param] || {}) ) {
        nonRedundantParams[param] = [];
      } else if (('__any' in (specsStruct[param] || {})) && Array.isArray(specs)) {
        nonRedundantParams[param] = [];
      } else {
        nonRedundantParams[param] = {};
      }
    } else {
      nonRedundantParams[param] = {};
    }
  }
}

module.exports = { getLastParamName, replaceConditionalMatch, checkRedundancy, insertNonRedundantParam };
