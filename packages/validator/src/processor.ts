import * as utils from './utils/utils';
import * as logger from './utils/logger';
import { validateCondition } from './validators/conditionValidator';
import { validateRegexp } from './validators/regexpValidator';
import { validateOptional } from './validators/optionalValidator';
import { validateAny } from './validators/anyValidator';
import { Log, Result, Roots } from './types';
import { execute } from './utils/action';
import fs from 'fs';
import { validateParameter } from './validators/parameterValidator';
import { combinePaths } from './utils/utils';

const apiTemplate = JSON.parse(fs.readFileSync('templates/apiSpecifications.json', 'utf8'));
const oisTemplate = JSON.parse(fs.readFileSync('templates/ois.json', 'utf8'));
const endpointsTemplate = JSON.parse(fs.readFileSync('templates/endpoints.json', 'utf8'));

/**
 * Recursion validating provided specification against template
 * @param specs - specification that is being validated
 * @param template - template the specification is validated against
 * @param paramPath - string of parameters separated by ".", representing path to current specs location (empty string is root)
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and nonRedundantParams
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function processSpecs(
  specs: any,
  template: any,
  paramPath: string,
  nonRedundantParams: any,
  roots: Roots,
  paramPathPrefix = ''
): Result {
  const messages: Log[] = [];
  let tmpNonRedundant: {} | [] = [];
  let tmpResult: Result = { valid: true, messages: [], output: {} };
  let tmpRoots: Roots = { specs: specs, nonRedundantParams: nonRedundantParams, output: {} };

  for (const key of Object.keys(template)) {
    if (key === '__ignore') {
      for (const copy of Object.keys(specs)) {
        if (!nonRedundantParams[copy]) {
          nonRedundantParams[copy] = JSON.parse(JSON.stringify(specs[copy]));
        }
      }

      continue;
    }

    switch (key) {
      case '__conditions':
        for (const condition of template[key]) {
          messages.push(...validateCondition(specs, condition, nonRedundantParams, paramPath, roots, paramPathPrefix));
        }

        break;

      case '__regexp':
        messages.push(...validateRegexp(specs, template, combinePaths(paramPathPrefix, paramPath)));
        break;

      case '__keyRegexp':
        messages.push(...validateRegexp(specs, template, combinePaths(paramPathPrefix, paramPath), true));
        break;

      case '__maxSize':
        if (template[key] < specs.length) {
          messages.push(
            logger.error(`${combinePaths(paramPathPrefix, paramPath)} must contain ${template[key]} or less items`)
          );
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
          const result = processSpecs(
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

          const result = processSpecs(
            specs[item],
            template[key],
            `${combinePaths(paramPath, item)}`,
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
        messages.push(...validateAny(specs, template[key], paramPath, nonRedundantParams, roots));

        break;

      case '__actions':
        execute(specs, template[key], paramPath, roots);

        break;

      case '__apiSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant, output: {} };

        tmpResult = processSpecs(
          specs,
          apiTemplate,
          '',
          tmpNonRedundant,
          tmpRoots,
          combinePaths(paramPathPrefix, paramPath)
        );
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__endpointsSpecs':
        tmpNonRedundant = [];
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant, output: {} };

        tmpResult = processSpecs(
          specs,
          endpointsTemplate,
          '',
          tmpNonRedundant,
          tmpRoots,
          combinePaths(paramPathPrefix, paramPath)
        );
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      case '__oisSpecs':
        tmpNonRedundant = {};
        tmpRoots = { specs, nonRedundantParams: tmpNonRedundant, output: {} };

        tmpResult = processSpecs(
          specs,
          oisTemplate,
          '',
          tmpNonRedundant,
          tmpRoots,
          combinePaths(paramPathPrefix, paramPath)
        );
        messages.push(...tmpResult.messages);

        nonRedundantParams['__noCheck'] = {};

        break;

      // key is not a special keyword, but a regular parameter
      default:
        messages.push(
          ...validateParameter(key, specs, template, paramPath, nonRedundantParams, roots, paramPathPrefix)
        );

        break;
    }
  }

  let valid = true;

  if (specs === roots.specs) {
    messages.push(...utils.warnExtraFields(roots.nonRedundantParams, specs, combinePaths(paramPathPrefix, paramPath)));
    valid = !messages.some((msg) => msg.level === 'error');
  }

  return { valid, messages, output: roots.output };
}
