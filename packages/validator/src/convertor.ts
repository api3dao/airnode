import { Log, Result } from './types';
import * as logger from './utils/logger';
import fs from 'fs';
import { processSpecs } from './processor';

const oas2ois = 'templates/OAS2OIS.json';
const ois2cs = 'templates/OIS2C&S.json';

function invalidConversionMessage(from, to): Log {
  return logger.error(`Conversion from ${from} to ${to} is not valid conversion`);
}

/**
 * Converts specification from provided file into format the template specifies
 * @param specsPath - specification file to convert, root must be an object (not an array)
 * @param templatePath - template json file
 * @returns array of messages and converted specification
 */
export function convert(specsPath: string | undefined, templatePath: string | undefined): Result {
  if (!specsPath || !templatePath) {
    return { valid: false, messages: [logger.error('Specification and template file must be provided')], output: {} };
  }

  let template, specs;

  try {
    template = fs.readFileSync(templatePath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${templatePath}`)], output: {} };
  }

  try {
    specs = fs.readFileSync(specsPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)], output: {} };
  }

  return convertJson(specs, template);
}

/**
 * Converts specification from provided string and converts it into format the template specifies
 * @param specs - specification to convert, root must be an object (not an array)
 * @param template - template json
 * @returns array of messages and converted specification
 */
export function convertJson(specs: string, template: string): Result {
  try {
    const nonRedundant = {};
    const output = {};
    const parsedTemplate = JSON.parse(template);
    const parsedSpecs = JSON.parse(specs);

    const result = processSpecs(parsedSpecs, parsedTemplate, '', nonRedundant, {
      specs: parsedSpecs,
      nonRedundantParams: nonRedundant,
      output,
    });

    return { valid: result.valid, messages: result.messages, output: JSON.parse(JSON.stringify(output)) };
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }], output: {} };
  }
}

/**
 * Converts specification from one format into another
 * @param from - format of the provided specification, can be "oas" or "ois"
 * @param to - format specification will be converted into, can be "ois" or "cs"
 * @param specs - specification that will be converted
 * @returns - converted specification as a Result object
 */
export function convertFromTo(from, to, specs): Result {
  from = from.toLowerCase();
  to = to.toLowerCase();

  let ois: Result = { valid: true, messages: [], output: {} };
  let cs: Result = { valid: true, messages: [], output: {} };

  if (from === 'oas') {
    switch (to) {
      case 'ois':
        return convert(specs, oas2ois);
      case 'cs':
      case 'configsecurity':
      case 'configandsecurity':
        ois = convert(specs, oas2ois);
        cs = convertJson(ois.output ? JSON.stringify(ois.output) : '{}', fs.readFileSync(ois2cs).toString());
        return { valid: ois.valid, messages: ois.messages, output: cs.output };
      default:
        return { valid: false, messages: [invalidConversionMessage(from, to)] };
    }
  } else if (from === 'ois' && (to === 'cs' || to === 'configsecurity' || to === 'configandsecurity')) {
    return convert(specs, ois2cs);
  }

  return { valid: false, messages: [invalidConversionMessage(from, to)] };
}
