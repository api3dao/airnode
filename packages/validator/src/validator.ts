import fs from 'fs';
import * as utils from './utils/utils';
import * as logger from './utils/logger';
import { validateCondition } from './validators/conditionValidator';
import { validateRegexp } from './validators/regexpValidator';
import { validateOptional } from './validators/optionalValidator';
import { isAnyParamValid } from './validators/anyValidator';
import { Log, Result, Roots } from './types';

const apiSpecs = JSON.parse(fs.readFileSync('specs/apiSpecifications.json', 'utf8'));
const oisSpecs = JSON.parse(fs.readFileSync('specs/ois.json', 'utf8'));
const endpointsSpecs = JSON.parse(fs.readFileSync('specs/endpoints.json', 'utf8'));
const configSecuritySpecs = JSON.parse(fs.readFileSync('specs/configSecurity.json', 'utf8'));

/**
 * Recursion validating provided specification against validator specification structure
 * @param specs - specification that is being validated
 * @param specsStruct - validator specification structure
 * @param paramPath - string of parameters separated by ".", representing path to current specs location (empty string in root)
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and specsStruct
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function validateSpecs(
  specs: any,
  specsStruct: any,
  paramPath: string,
  nonRedundantParams: any,
  roots: Roots,
  paramPathPrefix = ''
): Result {
  const messages: Log[] = [];
  let tmpNonRedundant: {} | [] = [];
  let tmpResult: Result = { valid: true, messages: [] };
  let tmpRoots: Roots = { specs: specs, nonRedundantParams: nonRedundantParams };

  for (const key of Object.keys(specsStruct)) {
    switch (key) {
      case '__conditions':
        for (const condition of specsStruct[key]) {
          messages.push(...validateCondition(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix));
        }

        break;

      case '__regexp':
        messages.push(...validateRegexp(specs, specsStruct, paramPath));
        break;

      case '__keyRegexp':
        messages.push(...validateRegexp(specs, specsStruct, paramPath, true));
        break;

      case '__maxSize':
        if (specsStruct[key] < specs.length) {
          messages.push(logger.error(`${paramPath} must contain ${specsStruct[key]} or less items`));
        }

        break;

      // validate array
      case '__arrayItem':
        // nonRedundantParams has to have the same structure as specsStruct
        if (!nonRedundantParams) {
          nonRedundantParams = [];
        }

        // validate each item in specs
        for (let i = 0; i < specs.length; i++) {
          nonRedundantParams.push({});
          const result = validateSpecs(
            specs[i],
            specsStruct[key],
            `${paramPath}[${i}]`,
            nonRedundantParams[i],
            roots,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      // in specs can be any parameter, should validate all of them according to whats in the specsStruct
      case '__objectItem':
        for (const item of Object.keys(specs)) {
          // insert empty type of item into nonRedundantParams
          nonRedundantParams[item] = utils.getEmptyNonRedundantParam(
            item,
            specsStruct,
            nonRedundantParams,
            specs[item]
          );

          const result = validateSpecs(
            specs[item],
            specsStruct[key],
            `${paramPath}${paramPath ? '.' : ''}${item}`,
            nonRedundantParams[item],
            roots,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      case '__optional':
        messages.push(
          ...validateOptional(specs, specsStruct[key], paramPath, nonRedundantParams, roots, paramPathPrefix)
        );

        break;

      // determines level of message for single parameter, currently used only in regexp validation
      case '__level':
        break;

      case '__any':
        if (!isAnyParamValid(specs, specsStruct[key], paramPath, nonRedundantParams, roots)) {
          messages.push(logger.error(`Required conditions not met in ${paramPath}`));
        }

        break;

      case '__apiSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, apiSpecs, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__endpointsSpecs':
        tmpNonRedundant = [];
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, endpointsSpecs, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__oisSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, oisSpecs, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      // key is not a special keyword, but a regular parameter
      default:
        if (!specs[key]) {
          messages.push(logger.error(`Missing parameter ${paramPath}${paramPath && key ? '.' : ''}${key}`));

          continue;
        }

        nonRedundantParams[key] = utils.getEmptyNonRedundantParam(key, specsStruct, nonRedundantParams, specs[key]);

        if (!Object.keys(specsStruct[key]).length) {
          continue;
        }

        tmpResult = validateSpecs(
          specs[key],
          specsStruct[key],
          `${paramPath}${paramPath ? '.' : ''}${key}`,
          nonRedundantParams[key],
          roots,
          paramPathPrefix
        );
        messages.push(...tmpResult.messages);

        break;
    }
  }

  let valid = true;

  if (specs === roots.specs) {
    messages.push(...utils.warnExtraFields(roots.nonRedundantParams, specs, paramPath));
    valid = !messages.some((msg) => msg.level === 'error');
  }

  return { valid, messages };
}

/**
 * Validates api specification
 * @param specs - api specification to validate
 * @returns array of error and warning messages
 */
export function isApiSpecsValid(specs: string): Result {
  const nonRedundant = {};

  try {
    const parsedSpecs = JSON.parse(specs);
    return validateSpecs(parsedSpecs, apiSpecs, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

/**
 * Validates endpoints array from oracle integration specification
 * @param specs - endpoints array to validate
 * @returns array of error and warning messages
 */
export function isEndpointsValid(specs: string): Result {
  const nonRedundant = [];

  try {
    const parsedSpecs = JSON.parse(specs);
    return validateSpecs(parsedSpecs, endpointsSpecs, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

/**
 * Validates oracle integration specification
 * @param specs - oracle integration specification to validate
 * @returns array of error and warning messages
 */
export function isOisValid(specs: string): Result {
  const nonRedundant = {};

  try {
    const parsedSpecs = JSON.parse(specs);
    return validateSpecs(parsedSpecs, oisSpecs, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

export function isConfigSecurityValid(configSpecs: string, securitySpecs: string): Result {
  const nonRedundant = {};

  try {
    const parsedConfigSpecs = JSON.parse(configSpecs);
    const parsedSecuritySpecs = JSON.parse(securitySpecs);
    const specs = { config: parsedConfigSpecs, security: parsedSecuritySpecs };
    return validateSpecs(specs, configSecuritySpecs, '', nonRedundant, {
      specs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}
