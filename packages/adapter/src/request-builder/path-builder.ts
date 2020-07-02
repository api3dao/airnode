import trimEnd from 'lodash/trimEnd';
import trimStart from 'lodash/trimStart';
import isEmpty from 'lodash/isEmpty';
import { Parameters } from './types';

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
    const withoutBraces = trimEnd(trimStart(match, '{'), '}');
    const value = parameters[withoutBraces];
    return updatedPath.replace(match, value);
  }, rawPath);

  // Check that all path parameters have been replaced
  const matchesPostParse = path.match(regex);
  if (matchesPostParse && !isEmpty(matchesPostParse)) {
    throw new Error(`The following path parameters were not provided: ${matchesPostParse.join(', ')}`);
  }

  return path;
}
