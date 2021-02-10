import fs from 'fs';
import * as utils from './utils/utils';
import * as logger from './utils/logger';
import { validateCondition } from './validators/conditionValidator';
import { validateRegexp } from './validators/regexpValidator';
import { validateOptional } from './validators/optionalValidator';
import { isAnyParamValid } from './validators/anyValidator';
import { Log, Result, Roots } from './types';

const apiTemplate = JSON.parse(fs.readFileSync('templates/apiSpecifications.json', 'utf8'));
const oisTemplate = JSON.parse(fs.readFileSync('templates/ois.json', 'utf8'));
const endpointsTemplate = JSON.parse(fs.readFileSync('templates/endpoints.json', 'utf8'));
const configSecurityTemplate = JSON.parse(fs.readFileSync('templates/configSecurity.json', 'utf8'));

/**
 * Recursion validating provided specification against template
 * @param specs - specification that is being validated
 * @param template - template the specification is validated against
 * @param paramPath - string of parameters separated by ".", representing path to current specs location (empty string in root)
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and nonRedundantParams
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function validateSpecs(
  specs: any,
  template: any,
  paramPath: string,
  nonRedundantParams: any,
  roots: Roots,
  paramPathPrefix = ''
): Result {
  const messages: Log[] = [];
  let tmpNonRedundant: {} | [] = [];
  let tmpResult: Result = { valid: true, messages: [] };
  let tmpRoots: Roots = { specs: specs, nonRedundantParams: nonRedundantParams };

  for (const key of Object.keys(template)) {
    switch (key) {
      case '__conditions':
        for (const condition of template[key]) {
          messages.push(...validateCondition(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix));
        }

        break;

      case '__regexp':
        messages.push(...validateRegexp(specs, template, paramPath));
        break;

      case '__keyRegexp':
        messages.push(...validateRegexp(specs, template, paramPath, true));
        break;

      case '__maxSize':
        if (template[key] < specs.length) {
          messages.push(logger.error(`${paramPath} must contain ${template[key]} or less items`));
        }

        break;

      // validate array
      case '__arrayItem':
        // nonRedundantParams has to have the same structure as template
        if (!nonRedundantParams) {
          nonRedundantParams = [];
        }

        // validate each item in specs
        for (let i = 0; i < specs.length; i++) {
          nonRedundantParams.push({});
          const result = validateSpecs(
            specs[i],
            template[key],
            `${paramPath}[${i}]`,
            nonRedundantParams[i],
            roots,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      // in specs can be any parameter, should validate all of them according to whats in the template
      case '__objectItem':
        for (const item of Object.keys(specs)) {
          // insert empty type of item into nonRedundantParams
          nonRedundantParams[item] = utils.getEmptyNonRedundantParam(item, template, nonRedundantParams, specs[item]);

          const result = validateSpecs(
            specs[item],
            template[key],
            `${paramPath}${paramPath ? '.' : ''}${item}`,
            nonRedundantParams[item],
            roots,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      case '__optional':
        messages.push(...validateOptional(specs, template[key], paramPath, nonRedundantParams, roots, paramPathPrefix));

        break;

      // determines level of message for single parameter, currently used only in regexp validation
      case '__level':
        break;

      case '__any':
        if (!isAnyParamValid(specs, template[key], paramPath, nonRedundantParams, roots)) {
          messages.push(logger.error(`Required conditions not met in ${paramPath}`));
        }

        break;

      case '__apiSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, apiTemplate, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__endpointsSpecs':
        tmpNonRedundant = [];
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, endpointsTemplate, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__oisSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant };

        tmpResult = validateSpecs(specs, oisTemplate, paramPath, tmpNonRedundant, tmpRoots, paramPath);
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      // key is not a special keyword, but a regular parameter
      default:
        if (!specs[key]) {
          messages.push(logger.error(`Missing parameter ${paramPath}${paramPath && key ? '.' : ''}${key}`));

          continue;
        }

        nonRedundantParams[key] = utils.getEmptyNonRedundantParam(key, template, nonRedundantParams, specs[key]);

        if (!Object.keys(template[key]).length) {
          continue;
        }

        tmpResult = validateSpecs(
          specs[key],
          template[key],
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
    return validateSpecs(parsedSpecs, apiTemplate, '', nonRedundant, {
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
    return validateSpecs(parsedSpecs, endpointsTemplate, '', nonRedundant, {
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
    return validateSpecs(parsedSpecs, oisTemplate, '', nonRedundant, {
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
    return validateSpecs(specs, configSecurityTemplate, '', nonRedundant, {
      specs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}
