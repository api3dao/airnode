import { keywords } from '../utils/globals';
import { Log } from '../types';
import * as utils from '../utils/utils';

/**
 * If '__catch' was defined in template, any messages should be replaced with message specified inside '__catch'
 * @param specs - validated specification that's on the same level as template, if specs is a string, keyword '__value' will be replaced with specs
 * @param template - template specifying '__catch', if keyword is not present, validateCatch will return provided messages
 * @param messages - messages that might be replaced with message specified in '__catch', if the array is empty or template doesn't contain '__catch', messages will be returned untouched
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @param rootSpecs - root of validate specification
 * @returns evaluated message specified in '__catch' if provided messages array is not empty and template contains '__catch', otherwise returns messages array untouched
 */
export function validateCatch(
  specs: any,
  template: any,
  messages: Log[],
  paramPath: string[],
  paramPathPrefix: string[],
  rootSpecs: any
): Log[] {
  if (!messages.length || !template[keywords.catch]) {
    return messages;
  }

  let message = utils.replaceParamIndexWithName(template[keywords.catch], paramPath);
  message = utils.replacePathsWithValues(specs, rootSpecs, message);

  if (!message[keywords.message]) {
    if (!message[keywords.level]) {
      return [];
    }

    return messages.map((msg) => {
      msg['level'] = message[keywords.level];
      return msg;
    });
  }

  if (typeof specs === 'string') {
    message[keywords.message] = message[keywords.message].replace(new RegExp(keywords.value, 'g'), specs);
  }

  message[keywords.message] = message[keywords.message].replace(
    new RegExp(keywords.fullPath, 'g'),
    [...paramPathPrefix, ...paramPath].join('.')
  );
  message[keywords.message] = message[keywords.message].replace(new RegExp(keywords.path, 'g'), paramPath.join('.'));

  if (paramPathPrefix.length) {
    message[keywords.message] = message[keywords.message].replace(
      new RegExp(`${keywords.prefix}(?=\\S)`, 'g'),
      `${paramPathPrefix.join('.')}.`
    );
  }

  message[keywords.message] = message[keywords.message].replace(
    new RegExp(keywords.prefix, 'g'),
    paramPathPrefix.join('.')
  );

  return [{ message: message[keywords.message], level: message[keywords.level] ? message[keywords.level] : 'error' }];
}
