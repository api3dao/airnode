import fs from 'fs';

import path from 'path';
import { Roots, Log } from '../types';
import * as logger from '../utils/logger';
import { processSpecs } from '../processor';
import { keywords } from '../utils/globals';

/**
 * Recursion validating provided specification against template
 * @param specs - specification that is being validated
 * @param nestedTemplatePath - template the specification will be validated against
 * @param paramPath - string of parameters separated by ".", representing path to current specs location (empty string is root)
 * @param templatePath - path to current validator template file
 * @param paramPathPrefix - in case roots are not the top layer parameters, parameter paths in messages will be prefixed with paramPathPrefix
 * @returns errors and warnings that occurred in validation of provided specification
 */
export function validateTemplate(
  specs: any,
  nestedTemplatePath: string,
  paramPath: string[],
  templatePath: string,
  paramPathPrefix: string[] = []
): Log[] {
  let template;

  try {
    template = JSON.parse(fs.readFileSync(`${templatePath}${nestedTemplatePath}`, 'utf8'));
  } catch {
    return [logger.error(`${templatePath}${nestedTemplatePath} is not validator template`)];
  }

  const roots: Roots = { specs, nonRedundantParams: keywords.arrayItem in template ? [] : {}, output: {} };
  const split = nestedTemplatePath.split(path.sep);
  nestedTemplatePath = split.slice(0, split.length - 1).join(path.sep);

  const result = processSpecs(
    specs,
    template,
    [],
    roots.nonRedundantParams,
    roots,
    `${templatePath}${nestedTemplatePath}${nestedTemplatePath ? path.sep : ''}`,
    [...paramPathPrefix, ...paramPath]
  );

  return result.messages;
}
