import * as logger from './logger';

export function getLastParamName(paramPath: string): string {
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

export function warnExtraFields(nonRedundant: any, specs: any, paramPath: string): logger.Log[] {
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

export function getEmptyNonRedundantParam(param: string, specsStruct: any, nonRedundantParams: any, specs: any): any {
  if (nonRedundantParams[param]) {
    return nonRedundantParams[param];
  }

  if ('__arrayItem' in (specsStruct[param] || {}) || ('__any' in (specsStruct[param] || {}) && Array.isArray(specs))) {
    return [];
  }

  return {};
}
