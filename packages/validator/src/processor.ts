import * as utils from './utils/utils';
import * as logger from './utils/logger';
import * as msg from './utils/messages';
import { keywords, regexList } from './utils/globals';
import { validateCondition } from './validators/conditionValidator';
import { validateRegexp } from './validators/regexpValidator';
import { validateOptional } from './validators/optionalValidator';
import { validateAny } from './validators/anyValidator';
import { Log, Result, Roots } from './types';
import { execute } from './utils/action';
import { validateParameter } from './validators/parameterValidator';
import { validateCatch } from './validators/catchValidator';
import { validateTemplate } from './validators/templateValidator';
import { validateType } from './validators/typeValidator';

/**
 * Validates provided specification against template
 * @param specs - specification that is being validated
 * @param template - template against which the specification is validated
 * @param paramPath - string of parameters separated by ".", representing path to current specs location (empty string is root)
 * @param nonRedundantParams - object containing all required and optional parameters that are being used
 * @param roots - roots of specs and nonRedundantParams
 * @param templatePath - path to current validator template file
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function processSpecs(
  specs: any,
  template: any,
  paramPath: string[],
  nonRedundantParams: any,
  roots: Roots,
  templatePath: string,
  paramPathPrefix: string[] = []
): Result {
  let messages: Log[] = [];

  if (template[keywords.type]) {
    const res = validateType(specs, template[keywords.type], paramPath, paramPathPrefix);

    if (res.length) {
      messages.push(...res);
      return { valid: false, messages, output: roots.output };
    }
  }

  for (const key of Object.keys(template)) {
    if (key === keywords.ignore) {
      for (const copy of Object.keys(specs)) {
        if (!nonRedundantParams[copy]) {
          nonRedundantParams[copy] = JSON.parse(JSON.stringify(specs[copy]));
        }
      }

      continue;
    }

    switch (key) {
      case keywords.conditions:
        for (const condition of template[key]) {
          messages.push(...validateCondition(specs, condition, paramPath, roots, templatePath, paramPathPrefix));
        }

        break;

      case keywords.regexp:
        messages.push(...validateRegexp(specs, template, [...paramPathPrefix, ...paramPath], roots.specs));
        break;

      case keywords.keyRegexp:
        messages.push(...validateRegexp(specs, template, [...paramPathPrefix, ...paramPath], roots.specs, true));
        break;

      case keywords.maxSize:
        if (template[key] < specs.length) {
          messages.push(
            logger.error(`${[...paramPathPrefix, ...paramPath].join('.')} must contain ${template[key]} or less items`)
          );
        }

        break;

      // validate array
      case keywords.arrayItem:
        if (!Array.isArray(specs)) {
          messages.push(msg.typeMismatch([...paramPathPrefix, ...paramPath], 'array'));
          break;
        }

        // nonRedundantParams has to have the same structure as template
        if (!nonRedundantParams) {
          nonRedundantParams = [];
        }

        if (!paramPath.length) {
          paramPath.push('[0]');
        }

        // validate each item in specs
        for (let i = 0; i < specs.length; i++) {
          nonRedundantParams.push({});

          paramPath[paramPath.length - 1] =
            paramPath[paramPath.length - 1].replace(regexList.arrayIndex, '') + `[${i}]`;

          const result = processSpecs(
            specs[i],
            template[key],
            paramPath,
            nonRedundantParams[i],
            roots,
            templatePath,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        paramPath[paramPath.length - 1] = paramPath[paramPath.length - 1].replace(regexList.arrayIndex, '');

        break;

      // in specs can be any parameter, should validate all of them according to whats in the template
      case keywords.objectItem:
        for (const item of Object.keys(specs)) {
          // insert empty type of item into nonRedundantParams
          nonRedundantParams[item] = utils.getEmptyNonRedundantParam(item, template, nonRedundantParams, specs[item]);

          const result = processSpecs(
            specs[item],
            template[key],
            [...paramPath, item],
            nonRedundantParams[item],
            roots,
            templatePath,
            paramPathPrefix
          );
          messages.push(...result.messages);
        }

        break;

      case keywords.optional:
        messages.push(
          ...validateOptional(specs, template[key], paramPath, nonRedundantParams, roots, templatePath, paramPathPrefix)
        );

        break;

      case keywords.catch:
      case keywords.type:
        break;

      case keywords.any:
        messages.push(...validateAny(specs, template[key], paramPath, nonRedundantParams, roots, templatePath));

        break;

      case keywords.actions:
        execute(specs, template[key], paramPath, roots);

        break;

      case keywords.template:
        messages.push(...validateTemplate(specs, template[key], paramPath, templatePath, paramPathPrefix));
        nonRedundantParams[keywords.noCheck] = {};

        break;

      // key is not a special keyword, but a regular parameter
      default:
        messages.push(
          ...validateParameter(
            key,
            specs,
            template,
            paramPath,
            nonRedundantParams,
            roots,
            templatePath,
            paramPathPrefix
          )
        );

        break;
    }
  }

  let valid = true;

  if (specs === roots.specs) {
    messages.push(...utils.warnExtraFields(roots.nonRedundantParams, specs, [...paramPathPrefix, ...paramPath]));
    messages = validateCatch(specs, template, messages, paramPath, paramPathPrefix, roots.specs);
    valid = !messages.some((msg) => msg.level === 'error');
    return { valid, messages, output: roots.output };
  }

  return {
    valid,
    messages: validateCatch(specs, template, messages, paramPath, paramPathPrefix, roots.specs),
    output: roots.output,
  };
}
