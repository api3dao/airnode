import { validateCatch } from './catchValidator';
import { processSpecs } from '../processor';
import * as logger from '../utils/logger';
import * as utils from '../utils/utils';
import { Log, Roots } from '../types';
import { keywords } from '../utils/globals';

/**
 * Validates "if" condition in which regular expression is matched against the key in specification
 * @param specs - specification containing objects with keys that will be matched with regular expression
 * @param condition - object containing the regular expression and validator structure, which will be validated in case the regular expression is matched
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs, nonRedundantParams and output
 * @param templatePath - path to current validator template file
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
function validateConditionRegexInKey(
  specs: any,
  condition: any,
  paramPath: string[],
  roots: Roots,
  templatePath: string,
  paramPathPrefix: string[]
): Log[] {
  const messages: Log[] = [];
  const paramName = Object.keys(condition[keywords.if])[0];
  const paramValue = condition[keywords.if][paramName];

  // In case of '__rootThen' validate from root
  const thenCondition = condition[keywords.rootThen] ? condition[keywords.rootThen] : condition[keywords.then];
  const currentSpecs = condition[keywords.rootThen] ? roots.specs : specs;
  const currentParamPath = condition[keywords.rootThen] ? paramPathPrefix : paramPath;

  // check all keys of children for a match with provided regex
  for (const thisName of Object.keys(specs)) {
    const matches = thisName.match(new RegExp(paramValue, 'g'));

    if (!matches) {
      continue;
    }

    // key matched regex, this means "if section" of the condition is fulfilled so structure in "then section" must be present
    for (const param of matches) {
      if (!param.length) {
        continue;
      }

      const tmpNonRedundantParams = Array.isArray(currentSpecs) ? [] : {};
      let template = utils.replaceConditionalMatch(param, thenCondition);
      template = utils.replaceParamIndexWithName(template, paramPath);
      template = utils.replacePathsWithValues(specs, roots.specs, template);

      const result = processSpecs(
        condition[keywords.rootThen] ? currentSpecs : currentSpecs[thisName],
        template,
        condition[keywords.rootThen] ? [] : [...currentParamPath, thisName],
        tmpNonRedundantParams,
        { specs: roots.specs, nonRedundantParams: tmpNonRedundantParams, output: roots.output },
        templatePath
      );

      if (result.messages.some((msg) => msg.level === 'error')) {
        // validateSpecs ended with errors => correct "then section" is not present in specs
        let tmpMessages = [
          logger.error(
            `Condition in ${[...paramPathPrefix, ...paramPath, thisName].join('.')} is not met with ${param}`
          ),
        ];

        tmpMessages = validateCatch(
          specs,
          utils.replaceConditionalMatch(param, condition),
          tmpMessages,
          [...paramPath, thisName],
          paramPathPrefix,
          roots.specs
        );

        messages.push(...tmpMessages);
      }
    }
  }

  return messages;
}

/**
 * Validates "if" condition in which regular expression is matched against the value in specification
 * @param specs - specification containing objects with keys that will be matched with regular expression
 * @param condition - object containing the regular expression and template, which will be validated in case the regular expression is matched
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs, nonRedundantParams and output
 * @param templatePath - path to current validator template file
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
function validateConditionRegexInValue(
  specs: any,
  condition: any,
  paramPath: string[],
  roots: Roots,
  templatePath: string,
  paramPathPrefix: string[]
): Log[] {
  let messages: Log[] = [];
  const paramName = Object.keys(condition[keywords.if])[0];
  const paramValue = condition[keywords.if][paramName];

  // In case of '__rootThen' validate from root
  let thenCondition = condition[keywords.rootThen] ? condition[keywords.rootThen] : condition[keywords.then];
  const currentSpecs = condition[keywords.rootThen] ? roots.specs : specs;
  const currentParamPath = condition[keywords.rootThen] ? paramPathPrefix : paramPath;

  if (paramName === keywords.this) {
    if (!specs.match(new RegExp(paramValue))) {
      return [];
    }

    thenCondition = utils.replaceConditionalMatch(specs, thenCondition);
  } else {
    if (!specs[paramName].match(new RegExp(paramValue))) {
      return [];
    }

    thenCondition = utils.replaceConditionalMatch(specs[paramName], thenCondition);
  }

  thenCondition = utils.replaceParamIndexWithName(thenCondition, paramPath);
  thenCondition = utils.replacePathsWithValues(specs, roots.specs, thenCondition);

  // parameter value matched regex, "then section" must be checked
  const tmpNonRedundantParams = Array.isArray(currentSpecs) ? [] : {};

  const result = processSpecs(
    currentSpecs,
    thenCondition,
    currentParamPath,
    tmpNonRedundantParams,
    { specs: roots.specs, nonRedundantParams: tmpNonRedundantParams, output: roots.output },
    templatePath
  );

  result.messages = result.messages.filter((msg) => {
    return !msg.message.startsWith('Extra field:');
  });

  if (!result.messages.some((msg) => msg.level === 'error')) {
    return [];
  }

  messages.push(
    logger.error(
      `Condition in ${[...paramPathPrefix, ...paramPath, ...(paramName === keywords.this ? [] : [paramName])].join(
        '.'
      )} is not met with ${paramName === keywords.this ? paramPath[paramPath.length - 1] : paramName}`
    )
  );
  messages = validateCatch(
    specs,
    utils.replaceConditionalMatch(paramName === keywords.this ? specs : specs[paramName], condition),
    messages,
    [...paramPath, ...(paramName === keywords.this ? [] : [paramName])],
    paramPathPrefix,
    roots.specs
  );

  return messages;
}

/**
 * Validates "if" and "require" conditions in template against provided specification
 * @param specs - specification that is being validated
 * @param condition - template of conditions that the specification will be checked against
 * @param paramPath - string of parameters separated by ".", representing path to current specs location
 * @param roots - roots of specs, nonRedundantParams and output
 * @param templatePath - path to current validator template file
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function validateCondition(
  specs: any,
  condition: any,
  paramPath: string[],
  roots: Roots,
  templatePath: string,
  paramPathPrefix: string[]
): Log[] {
  const messages: Log[] = [];
  const paramName = Object.keys(condition[keywords.if])[0];

  if (paramName === keywords.thisName) {
    messages.push(...validateConditionRegexInKey(specs, condition, paramPath, roots, templatePath, paramPathPrefix));
  } else if (specs[paramName] || paramName === keywords.this) {
    messages.push(...validateConditionRegexInValue(specs, condition, paramPath, roots, templatePath, paramPathPrefix));
  }

  return messages;
}
