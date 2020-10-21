// checks if key or value (depends on isKeyRegexp) matches regular expression in specsStruct
import * as logger from '../utils/logger';
import { Log } from '../types';

export function validateRegexp(specs: any, specsStruct: any, paramPath: string, isKeyRegexp = false): Log[] {
  const messages: Log[] = [];

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
