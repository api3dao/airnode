import * as fs from 'fs';
import * as path from 'path';
import template from 'lodash/template';
import dotenv from 'dotenv';
import { Log, templates } from '../types';
import * as logger from '../utils/logger';
import { unknownConversion } from '../utils/messages';
import { regexList } from '../utils/globals';

const validatorTemplatesPath = path.resolve(__dirname, '../../templates');
const conversionsPath = path.resolve(__dirname, '../../conversions');

export const templateVersions = fs
  .readdirSync(validatorTemplatesPath, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort((a: string, b: string) => {
    if (!a.match(/^[0-9\.]+$/)) {
      if (!b.match(/^[0-9\.]+$/)) {
        return b.localeCompare(a);
      }

      return 1;
    }

    if (!b.match(/^[0-9\.]+$/)) {
      return -1;
    }

    return b.localeCompare(a, undefined, { numeric: true });
  });

const conversionTemplates = fs.readdirSync(conversionsPath);

export const conversions: {
  [fromName: string]: { [fromVersion: string]: { [toName: string]: string[] } };
} = {};

conversionTemplates.forEach((file) => {
  const [from, to] = file.replace(/\.json$/, '').split('------');
  const [fromName, fromVersion] = from.split('@');
  const [toName, toVersion] = to.split('@');

  conversions[fromName] ??= {};
  conversions[fromName][fromVersion] ??= {};
  conversions[fromName][fromVersion][toName] ??= [];
  conversions[fromName][fromVersion][toName].push(toVersion);
});

// Regular expression that does not match anything, ensuring no escaping or interpolation happens
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L199
const NO_MATCH_REGEXP = /($^)/;
// Regular expression matching ES template literal delimiter (${}) with escaping
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L175
const ES_MATCH_REGEXP = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

/**
 * Finds path to latest version of template
 * @param template
 */
function getLatestPath(template: string): string | null {
  for (const version of templateVersions) {
    if (fs.existsSync(path.resolve(validatorTemplatesPath, version, template))) {
      return path.resolve(validatorTemplatesPath, version, template);
    }
  }

  return null;
}

/**
 * Returns path to template with specified version
 * @param template - full name of the template file
 * @param messages - array into which warnings/errors will pushed
 * @param version (optional) - if not specified, latest version of the template is returned
 */
export function getPath(template: string, messages: Log[], version = ''): string | null {
  if (version) {
    const parsedVersion = version.replace(regexList.patchVersion, '');
    if (fs.existsSync(path.resolve(validatorTemplatesPath, parsedVersion, template))) {
      return path.resolve(validatorTemplatesPath, parsedVersion, template);
    } else {
      messages.push({
        level: 'warning',
        message: `Unable to find ${template} with version ${version}, latest version of ${template} will be used`,
      });
    }
  }

  const res = getLatestPath(template);

  if (!res) {
    messages.push({ level: 'error', message: `Unable to find template for ${template}` });
    return null;
  }

  return res;
}

/**
 * Returns path to conversion template between specified formats
 * @param from - name of source specification format
 * @param to - name of target specification format
 * @param messages - array into which warnings/errors will pushed
 * @param fromVersion (optional) - version of source specification format, if not specified, latest version of the template is returned
 * @param toVersion (optional) - version of target specification format, if not specified, latest version of the template is returned
 */
export function getConversionPath(
  from: string,
  to: string,
  messages: Log[],
  fromVersion?: string,
  toVersion?: string
): string | null {
  if (!conversions[from]) {
    messages.push(unknownConversion(from, to));
    return null;
  }

  if (!fromVersion) {
    let fromLatest;
    const versionRegex = /^[0-9\.]+$/;

    for (const version in conversions[from]) {
      if (!conversions[from][version][to] || (fromLatest && !version.match(versionRegex))) {
        continue;
      }

      fromLatest = !fromLatest || !fromLatest.match(versionRegex) || fromLatest < version ? version : fromLatest;
    }

    if (!fromLatest) {
      messages.push(unknownConversion(from, to));
      return null;
    }

    const latestVersion = Object.keys(conversions[from])
      .filter((key) => key.match(versionRegex))
      .sort()
      .reverse()[0];

    if (fromLatest !== latestVersion) {
      messages.push(
        logger.warn(
          `Conversion from latest version of ${from} to ${to} does not exist, conversion from ${from}@${fromLatest} will be used instead.`
        )
      );
    }

    fromVersion = fromLatest;
  }

  const parsedFromVersion = fromVersion.replace(regexList.patchVersion, '');

  if (!conversions[from][parsedFromVersion]) {
    messages.push(unknownConversion(`${from}@${fromVersion}`, to));
    return null;
  }

  if (!conversions[from][parsedFromVersion][to]) {
    messages.push(unknownConversion(from, to));
    return null;
  }

  if (!toVersion) {
    let toLatest;

    for (const version of conversions[from][parsedFromVersion][to]) {
      toLatest = !toLatest || (toLatest < version && version.match(/^[0-9\.]+$/)) ? version : toLatest;
    }

    if (!toLatest) {
      messages.push(unknownConversion(from, to));
      return null;
    }

    toVersion = toLatest;
  }

  const parsedToVersion = toVersion.replace(regexList.patchVersion, '');

  if (
    !fs.existsSync(path.resolve(conversionsPath, `${from}@${parsedFromVersion}------${to}@${parsedToVersion}.json`))
  ) {
    messages.push(unknownConversion(`${from}@${fromVersion}`, `${to}@${toVersion}`));
    return null;
  }

  return path.resolve(conversionsPath, `${from}@${parsedFromVersion}------${to}@${parsedToVersion}.json`);
}

export function parseEnv(envPath: string, messages: Log[]): Record<string, string | undefined> | undefined {
  let env;

  try {
    env = fs.readFileSync(envPath);

    try {
      return dotenv.parse(env);
    } catch (e) {
      messages.push(logger.error(`${envPath} is not valid env file`));
      return undefined;
    }
  } catch (e) {
    messages.push(logger.error(`Unable to read file ${envPath}`));
    return undefined;
  }
}

export function interpolate(
  specs: unknown,
  env: Record<string, string | undefined>,
  messages: Log[]
): object | undefined {
  let interpolated;

  try {
    interpolated = JSON.parse(
      template(JSON.stringify(specs), {
        escape: NO_MATCH_REGEXP,
        evaluate: NO_MATCH_REGEXP,
        interpolate: ES_MATCH_REGEXP,
      })(env)
    );
  } catch (e) {
    messages.push(logger.error('Unable to interpolate provided specification'));
    return undefined;
  }

  return interpolated;
}

export function readJson(filePath: string, messages: Log[]): object | undefined {
  let res;

  try {
    res = fs.readFileSync(path.resolve(filePath), 'utf-8');
  } catch (e) {
    messages.push(logger.error(`Unable to read file ${path.resolve(filePath)}`));
    return undefined;
  }

  try {
    res = JSON.parse(res);
  } catch (e) {
    messages.push(logger.error(`${path.resolve(filePath)} is not valid JSON: ${e}`));
    return undefined;
  }

  return res;
}

export function parseTemplateName(templateName: string, messages: Log[]): [name: string, version?: string] | undefined {
  const [name, version] = templateName.split('@');

  if (!templates[name.toLowerCase() as keyof typeof templates]) {
    messages.push(logger.error(`${name} is not a valid template name`));
    return undefined;
  }

  if (version && !version.match(regexList.templateVersion)) {
    messages.push(logger.error(`${version} is not a valid version`));
    return undefined;
  }

  return [templates[name.toLowerCase() as keyof typeof templates], version];
}
