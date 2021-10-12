import { Log, Roots } from '../types';
import * as logger from '../utils/logger';
import * as msg from '../utils/messages';
import * as utils from '../utils/utils';
import { processSpecs } from '../processor';
import { regexList } from '../utils/globals';

/**
 * Validates parameter from template, that is not a validator keyword
 * @param param - parameter in template that will be validated, this parameter can be also an array
 * @param specs - specification that will be checked if it includes provided parameter
 * @param template - template in which the parameter is nested in
 * @param paramPath - string of parameters separated by ".", representing path to current specs location (empty string in root)
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and nonRedundantParams
 * @param templatePath - path to current validator template file
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function validateParameter(
  param: string,
  specs: any,
  template: any,
  paramPath: string[],
  nonRedundantParams: any,
  roots: Roots,
  templatePath = '',
  paramPathPrefix: string[] = []
): Log[] {
  const arrayIndex = param.match(regexList.arrayIndex);

  if (arrayIndex) {
    // parameter is array, item on specified index should be processed
    const processedParam = param.replace(arrayIndex[0], '');

    if (processedParam.length && !specs[processedParam]) {
      return [logger.error(`Missing parameter ${[...paramPathPrefix, ...paramPath, processedParam].join('.')}`)];
    }

    const index = parseInt(arrayIndex[1]);
    let currentSpecs = specs;

    if (processedParam.length) {
      currentSpecs = specs[processedParam];
      nonRedundantParams[processedParam] = utils.getEmptyNonRedundantParam(
        processedParam,
        template,
        nonRedundantParams,
        specs[processedParam]
      );
      nonRedundantParams = nonRedundantParams[processedParam];
    }

    if (!Array.isArray(currentSpecs)) {
      return [msg.typeMismatch([...paramPathPrefix, ...paramPath], 'array')];
    }

    if (index >= currentSpecs.length) {
      return [
        logger.error(
          `Missing parameter ${[...paramPathPrefix, ...paramPath, `${processedParam}[${index}]`].join('.')}`
        ),
      ];
    }

    for (let i = nonRedundantParams.length; i <= index; i++) {
      nonRedundantParams.push({});
    }

    return processSpecs(
      currentSpecs[index],
      template[param],
      [...paramPath, `${processedParam}[${index}]`],
      nonRedundantParams[index],
      roots,
      templatePath,
      paramPathPrefix
    ).messages;
  }

  if (typeof specs !== 'object' || !(param in specs)) {
    return [logger.error(`Missing parameter ${[...paramPathPrefix, ...paramPath, param].join('.')}`)];
  }

  nonRedundantParams[param] = utils.getEmptyNonRedundantParam(param, template, nonRedundantParams, specs[param]);

  if (!Object.keys(template[param]).length) {
    return [];
  }

  return processSpecs(
    specs[param],
    template[param],
    [...paramPath, param],
    nonRedundantParams[param],
    roots,
    templatePath,
    paramPathPrefix
  ).messages;
}
