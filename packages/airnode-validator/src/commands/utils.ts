import * as fs from 'fs';
import * as path from 'path';
import * as logger from '../utils/logger';
import { Log } from '../types';
import { unknownConversion } from '../utils/messages';

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
    if (fs.existsSync(path.resolve(validatorTemplatesPath, version, template))) {
      return path.resolve(validatorTemplatesPath, version, template);
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

  if (!conversions[from][fromVersion]) {
    messages.push(unknownConversion(`${from}@${fromVersion}`, to));
    return null;
  }

  if (!conversions[from][fromVersion][to]) {
    messages.push(unknownConversion(from, to));
    return null;
  }

  if (!toVersion) {
    let toLatest;

    for (const version of conversions[from][fromVersion][to]) {
      toLatest = !toLatest || (toLatest < version && version.match(/^[0-9\.]+$/)) ? version : toLatest;
    }

    if (!toLatest) {
      messages.push(unknownConversion(from, to));
      return null;
    }

    toVersion = toLatest;
  }

  if (!fs.existsSync(path.resolve(conversionsPath, `${from}@${fromVersion}------${to}@${toVersion}.json`))) {
    messages.push(unknownConversion(`${from}@${fromVersion}`, `${to}@${toVersion}`));
    return null;
  }

  return path.resolve(conversionsPath, `${from}@${fromVersion}------${to}@${toVersion}.json`);
}
