'use strict';

function getLastParamName(paramPath) {
  const lastDotIndex = paramPath.lastIndexOf('.');

  if (lastDotIndex >= 0) {
    return paramPath.slice(lastDotIndex + 1);
  }

  return paramPath;
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

    return [...acc, { level: 'warning', message: `Extra field: ${paramPath}${paramPath ? '.' : ''}${key}` }];
  }, []);
}

function getEmptyNonRedundantParam(param, specsStruct, nonRedundantParams, specs) {
  if (nonRedundantParams[param]) {
    return nonRedundantParams[param];
  }

  if ('__arrayItem' in (specsStruct[param] || {}) ||
    (('__any' in (specsStruct[param] || {})) && Array.isArray(specs))) {
    return  [];
  }

  return {};
}

module.exports = { getLastParamName, replaceConditionalMatch, warnExtraFields, getEmptyNonRedundantParam };
