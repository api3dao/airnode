'use strict';

const logger = require('./logger');

function getLastParamName(paramPath) {
  const lastDotIndex = paramPath.lastIndexOf('.');

  if (lastDotIndex >= 0) {
    return paramPath.slice(lastDotIndex + 1);
  }

  return paramPath;
}

/*
Used in conditions
if parameter key matches provided regular expression all keys '__match' in '__then' tree
must be replaced with matched parameter key,
except '__match' keys that might be in different condition included in the '__then' tree
 */
function replaceConditionalMatch(match, specs) {
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

function warnExtraFields(nonRedundant, specs, paramPath) {
  if (typeof specs !== 'object') {
    return [];
  }

  if (Array.isArray(specs)) {
    let messages = [];

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

function getEmptyNonRedundantParam(param, specsStruct, nonRedundantParams, specs) {
  if (nonRedundantParams[param]) {
    return nonRedundantParams[param];
  }

  if ('__arrayItem' in (specsStruct[param] || {}) || ('__any' in (specsStruct[param] || {}) && Array.isArray(specs))) {
    return [];
  }

  return {};
}

module.exports = { getLastParamName, replaceConditionalMatch, warnExtraFields, getEmptyNonRedundantParam };
