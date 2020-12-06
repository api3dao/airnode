import fs from 'fs';
import * as logger from './utils/logger';
import { Result } from './types';
import { validateSpecs, isConfigSecurityValid } from './validator';

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
    specs = fs.readFileSync(specsPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)] };
  }

  return validateJson(specs, template);
}

/**
 * Validates specification from provided string according to string containing template structure
 * @param specs - specification to validate, root must be an object (not an array)
 * @param template - template json
 * @returns array of error and warning messages
 */
export function validateJson(specs: string, template: string): Result {
  try {
    const nonRedundant = {};
    const parsedTemplate = JSON.parse(template);
    const parsedSpecs = JSON.parse(specs);

    return validateSpecs(parsedSpecs, parsedTemplate, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
    });
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }
}

/**
 * Validates config and security
 * @param configPath - path to config json file
 * @param securityPath - path to security json file
 * @returns array of error and warning messages
 */
export function validateConfigSecurity(configPath: string | undefined, securityPath: string | undefined): Result {
  if (!configPath || !securityPath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')] };
  }

  let config, security;

  try {
    config = fs.readFileSync(configPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${configPath}`)] };
  }

  try {
    security = fs.readFileSync(securityPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${securityPath}`)] };
  }

  return isConfigSecurityValid(config, security);
}
