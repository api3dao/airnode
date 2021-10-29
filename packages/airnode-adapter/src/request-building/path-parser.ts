import trimEnd from 'lodash/trimEnd';
import trimStart from 'lodash/trimStart';
import isEmpty from 'lodash/isEmpty';
import { Parameters } from '../types';

function removeBraces(value: string) {
  return trimEnd(trimStart(value, '{'), '}');
}

export function parsePathWithParameters(rawPath: string, parameters: Parameters) {
  // Match on anything in the path that is braces
  // i.e. The path /users/{id}/{action} will match ['{id}', '{action}']
  const regex = /\{([^}]+)\}/g;
  const matches = rawPath.match(regex);

  // The path contains no braces so no action required
  if (!matches || isEmpty(matches)) {
    return rawPath;
  }

  const path = matches.reduce((updatedPath: string, match: string) => {
    const withoutBraces = removeBraces(match);
    const value = parameters[withoutBraces];
    if (value) {
      return updatedPath.replace(match, value);
    }
    return updatedPath;
  }, rawPath);

  // Check that all path parameters have been replaced
  const matchesPostParse = path.match(regex);
  if (matchesPostParse && !isEmpty(matchesPostParse)) {
    const missingParams = matchesPostParse.map((m) => `'${removeBraces(m)}'`).join(', ');
    throw new Error(`The following path parameters were expected but not provided: ${missingParams}`);
  }

  return path;
}
