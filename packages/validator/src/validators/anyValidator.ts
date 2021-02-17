import * as utils from '../utils/utils';
import { processSpecs } from '../processor';
import { Roots } from '../types';

/**
 * Checks if at least one param exists in provided specification conforming the validator specification structure
 * @param specs - specification that is being validated
 * @param template - must be on the same level as specs
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and nonRedundantParams
 * @returns true if at least one child of specs satisfies template, otherwise returns false
 */
export function isAnyParamValid(
  specs: any,
  template: any,
  paramPath: string,
  nonRedundantParams: any,
  roots: Roots
): boolean {
  if (!specs || typeof specs !== 'object') {
    return false;
  }

  if (Array.isArray(specs)) {
    for (let paramIndex = 0; paramIndex < specs.length; paramIndex++) {
      let nonRedundantParamsCopy = {};

      if (nonRedundantParams[paramIndex]) {
        nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[paramIndex]));
      } else {
        nonRedundantParams.push({});
      }

      const result = processSpecs(
        specs[paramIndex],
        template,
        paramPath,
        nonRedundantParams[nonRedundantParams.length - 1],
        roots
      );

      if (!result.messages.length) {
        return true;
      }

      nonRedundantParams[paramIndex] = nonRedundantParamsCopy;
    }

    return false;
  }

  for (const paramKey of Object.keys(specs)) {
    let nonRedundantParamsCopy = {};

    if (nonRedundantParams[paramKey]) {
      nonRedundantParamsCopy = JSON.parse(JSON.stringify(nonRedundantParams[paramKey]));
    } else {
      nonRedundantParams[paramKey] = utils.getEmptyNonRedundantParam(
        paramKey,
        template,
        nonRedundantParams,
        specs[paramKey]
      );
    }

    const result = processSpecs(specs[paramKey], template, paramPath, nonRedundantParams[paramKey], roots);

    if (!result.messages.length) {
      return true;
    }

    nonRedundantParams[paramKey] = nonRedundantParamsCopy;
  }

  return false;
}
