import * as utils from '../utils/utils';
import { validateSpecs } from '../validator';
import { Roots } from '../types';

/**
 * Checks if at least one param exists in provided specification conforming the validator specification structure
 * @param specs - specification that is being validated
 * @param specsStruct - validator specification structure, must be on the same level as specs
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and specsStruct
 * @returns true if at least one child of specs satisfies specsStruct, otherwise returns false
 */
export function isAnyParamValid(
  specs: any,
  specsStruct: any,
  paramPath: string,
  nonRedundantParams: any,
  roots: Roots
): boolean {
  if (!specs) {
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

      const result = validateSpecs(
        specs[paramIndex],
        specsStruct,
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
        specsStruct,
        nonRedundantParams,
        specs[paramKey]
      );
    }

    const result = validateSpecs(specs[paramKey], specsStruct, paramPath, nonRedundantParams[paramKey], roots);

    if (!result.messages.length) {
      return true;
    }

    nonRedundantParams[paramKey] = nonRedundantParamsCopy;
  }

  return false;
}
