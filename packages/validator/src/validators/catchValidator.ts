import { Log } from '../types';
import * as utils from '../utils/utils';

export function validateCatch(
  specs: any,
  template: any,
  messages: Log[],
  paramPath: string,
  paramPathPrefix: string,
  rootSpecs: any
): Log[] {
  if (!messages.length || !template['__catch']) {
    return messages;
  }

  let message = utils.replaceParamIndexWithName(template['__catch'], paramPath);
  message = utils.replacePathsWithValues(specs, rootSpecs, message);

  if (typeof specs === 'string') {
    message['message'] = message['message'].replace(/__value/g, specs);
  }

  return [{ message: message['message'], level: message['level'] ? message['level'] : 'error' }];
}
