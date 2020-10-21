// validates optional parameters
import * as utils from '../utils/utils';
import { validateSpecs } from '../validator';
import { Roots, Log } from '../types';

export function validateOptional(
  specs: any,
  specsStruct: any,
  paramPath: string,
  nonRedundantParams: any,
  roots: Roots,
  paramPathPrefix: string
): Log[] {
  const messages: Log[] = [];

  for (const optionalItem of Object.keys(specsStruct)) {
    for (const item of Object.keys(specs)) {
      // in the specs might be other parameters, only the optional ones are validated here
      if (item === optionalItem) {
        nonRedundantParams[item] = utils.getEmptyNonRedundantParam(item, specsStruct, nonRedundantParams, specs[item]);

        const result = validateSpecs(
          specs[item],
          specsStruct[item],
          `${paramPath}${paramPath ? '.' : ''}${item}`,
          nonRedundantParams[item],
          roots,
          paramPathPrefix
        );
        messages.push(...result.messages);
      }
    }
  }

  return messages;
}
