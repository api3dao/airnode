import * as fs from 'fs';
import * as path from 'path';
import { Log } from '../types';

export const templateVersions = fs
  .readdirSync(path.resolve(__dirname, '../../templates'), { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory() && dirent.name !== 'conversion')
  .map((dirent) => dirent.name)
  .sort((a: any, b: string) => b.localeCompare(a, undefined, { numeric: true }));

const conversionTemplates = fs.readdirSync(path.resolve(__dirname, '../../templates/conversion'));

export const conversions: {
  [fromName: string]: { [fromVersion: string]: { [toName: string]: string[] } };
} = {};

conversionTemplates.forEach((file) => {
  const [from, to] = file.replace(/\.json$/, '').split('->');
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
    if (fs.existsSync(path.resolve(__dirname, `../../templates/${version}/${template}`))) {
      return path.resolve(__dirname, `../../templates/${version}/${template}`);
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
export function getPath(template: string, messages: Log[], version = ''): string {
  if (version) {
    if (fs.existsSync(path.resolve(__dirname, `../../templates/${version}/${template}`))) {
      return path.resolve(__dirname, `../../templates/${version}/${template}`);
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
    return '';
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
): string {
  if (!conversions[from]) {
    messages.push({ level: 'error', message: `Unknown conversion from ${from} to ${to}` });
    return '';
  }

  if (!fromVersion) {
    let fromLatest;

    for (const version in conversions[from]) {
      if (!conversions[from][version][to]) {
        continue;
      }

      fromLatest = !fromLatest || (fromLatest < version && version.match(/^[0-9\.]+$/)) ? version : fromLatest;
    }

    if (!fromLatest) {
      messages.push({ level: 'error', message: `Unknown conversion from ${from} to ${to}` });
      return '';
    }

    fromVersion = fromLatest;
  }

  if (!conversions[from][fromVersion]) {
    messages.push({ level: 'error', message: `Unknown conversion from ${from}@${fromVersion} to ${to}` });
    return '';
  }

  if (!conversions[from][fromVersion][to]) {
    messages.push({ level: 'error', message: `Unknown conversion from ${from} to ${to}` });
    return '';
  }

  if (!toVersion) {
    let toLatest;

    for (const version of conversions[from][fromVersion][to]) {
      toLatest = !toLatest || (toLatest < version && version.match(/^[0-9\.]+$/)) ? version : toLatest;
    }

    if (!toLatest) {
      messages.push({ level: 'error', message: `Unknown conversion from ${from} to ${to}` });
      return '';
    }

    toVersion = toLatest;
  }

  if (
    !fs.existsSync(
      path.resolve(__dirname, `../../templates/conversion/${from}@${fromVersion}->${to}@${toVersion}.json`)
    )
  ) {
    messages.push({ level: 'error', message: `Unknown conversion from ${from}@${fromVersion} to ${to}@${toVersion}` });
    return '';
  }

  return path.resolve(__dirname, `../../templates/conversion/${from}@${fromVersion}->${to}@${toVersion}.json`);
}
