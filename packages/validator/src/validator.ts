import fs from 'fs';
import * as logger from './utils/logger';
import { Result } from './types';
import { processSpecs } from './processor';

const apiTemplate = JSON.parse(fs.readFileSync('templates/apiSpecifications.json', 'utf8'));
const oisTemplate = JSON.parse(fs.readFileSync('templates/ois.json', 'utf8'));
const endpointsTemplate = JSON.parse(fs.readFileSync('templates/endpoints.json', 'utf8'));
const configTemplate = JSON.parse(fs.readFileSync('templates/config.json', 'utf8'));

/**
 * Validates specification from provided file according to template file
 * @param specsPath - specification file to validate, root must be an object (not an array)
 * @param templatePath - template json file
 * @returns array of error and warning messages
 */
export function validate(specsPath: string | undefined, templatePath: string | undefined): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let template, specs;

  try {
    template = fs.readFileSync(templatePath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${templatePath}`)] };
  }

  try {
    template = JSON.parse(template);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${templatePath} is not valid JSON: ${e}`)] };
  }

  try {
    specs = fs.readFileSync(specsPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)] };
  }

  try {
    specs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${specsPath} is not valid JSON: ${e}`)] };
  }

  return validateJson(specs, template);
}

/**
 * Validates specification from provided string according to string containing template structure
 * @param specs - specification to validate, root must be an object (not an array)
 * @param template - template json
 * @returns array of error and warning messages
 */
export function validateJson(specs: object, template: object): Result {
  const nonRedundant = template['__arrayItem'] ? [] : {};

  return processSpecs(specs, template, '', nonRedundant, {
    specs: specs,
    nonRedundantParams: nonRedundant,
    output: {},
  });
}

export function isConfigValid(specs: string): Result {
  const nonRedundant = {};
  let parsedSpecs;

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return processSpecs(parsedSpecs, configTemplate, '', nonRedundant, {
    specs: parsedSpecs,
    nonRedundantParams: nonRedundant,
    output: {},
  });
}

/**
 * Validates api specification
 * @param specs - api specification to validate
 * @returns array of error and warning messages
 */
export function isApiSpecsValid(specs: string): Result {
  const nonRedundant = {};
  let parsedSpecs;

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return processSpecs(parsedSpecs, apiTemplate, '', nonRedundant, {
    specs: parsedSpecs,
    nonRedundantParams: nonRedundant,
    output: {},
  });
}

/**
 * Validates endpoints array from oracle integration specification
 * @param specs - endpoints array to validate
 * @returns array of error and warning messages
 */
export function isEndpointsValid(specs: string): Result {
  const nonRedundant = [];
  let parsedSpecs;

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return processSpecs(parsedSpecs, endpointsTemplate, '', nonRedundant, {
    specs: parsedSpecs,
    nonRedundantParams: nonRedundant,
    output: {},
  });
}

/**
 * Validates oracle integration specification
 * @param specs - oracle integration specification to validate
 * @returns array of error and warning messages
 */
export function isOisValid(specs: string): Result {
  const nonRedundant = {};
  let parsedSpecs;

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return processSpecs(parsedSpecs, oisTemplate, '', nonRedundant, {
    specs: parsedSpecs,
    nonRedundantParams: nonRedundant,
    output: {},
  });
}
