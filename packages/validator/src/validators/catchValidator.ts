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
  if (!messages.length || !template['__catch']) {
    return messages;
  }

  let message = utils.replaceParamIndexWithName(template['__catch'], paramPath);
  message = utils.replacePathsWithValues(specs, rootSpecs, message);

  if (!message['__message']) {
    if (!message['__level']) {
      return [];
    }

    return messages.map((msg) => {
      msg['level'] = message['__level'];
      return msg;
    });
  }

  if (typeof specs === 'string') {
    message['__message'] = message['__message'].replace(/__value/g, specs);
  }

  message['__message'] = message['__message'].replace(/__fullPath/g, [...paramPathPrefix, ...paramPath].join('.'));
  message['__message'] = message['__message'].replace(/__path/g, paramPath.join('.'));
  message['__message'] = message['__message'].replace(/__prefix/g, paramPathPrefix.join('.'));

  return [{ message: message['__message'], level: message['__level'] ? message['__level'] : 'error' }];
}
