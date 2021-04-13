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
    template = JSON.parse(template);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${templatePath} is not valid JSON: ${e}`)] };
  }

  try {
    specs = fs.readFileSync(specsPath);
  } catch (e) {
    return { valid: false, messages: [logger.error(`Unable to read file ${specsPath}`)], output: {} };
  }

  try {
    specs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [logger.error(`${specsPath} is not valid JSON: ${e}`)] };
  }

  const split = templatePath.split('/');

  return convertJson(specs, template, split.slice(0, split.length - 1).join('/') + '/');
}

/**
 * Converts specification from provided string and converts it into format the template specifies
 * @param specs - specification to convert, root must be an object (not an array)
 * @param template - template json
 * @param templatePath - path to current validator template file
 * @returns array of messages and converted specification
 */
export function convertJson(specs: object, template: object, templatePath = ''): Result {
  const nonRedundant = {};
  const output = {};

  const result = processSpecs(
    specs,
    template,
    '',
    nonRedundant,
    {
      specs: specs,
      nonRedundantParams: nonRedundant,
      output,
    },
    templatePath
  );

  return { valid: result.valid, messages: result.messages, output: JSON.parse(JSON.stringify(output)) };
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

  if (from === 'oas' && to === 'ois') {
    return convert(specs, oas2ois);
  } else if (from === 'oas' && to.match(/^(cs|configsecurity|configandsecurity)$/)) {
    ois = convert(specs, oas2ois);
    cs = convertJson(ois.output ? ois.output : {}, JSON.parse(fs.readFileSync(ois2cs).toString()), ois2cs);
    return { valid: ois.valid, messages: ois.messages, output: cs.output };
  } else if (from === 'ois' && to.match(/^(cs|configsecurity|configandsecurity)$/)) {
    return convert(specs, ois2cs);
  }

  return { valid: false, messages: [invalidConversionMessage(from, to)] };
}
