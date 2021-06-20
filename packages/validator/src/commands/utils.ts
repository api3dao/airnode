import { Log } from '../types';

const fs = require('fs');

export const templateVersions = fs
  .readdirSync('templates', { withFileTypes: true })
  .filter((dirent: { isDirectory: () => any }) => dirent.isDirectory())
  .map((dirent: { name: any }) => dirent.name)
  .sort((a: any, b: string) => b.localeCompare(a, undefined, { numeric: true }));

/**
 * Finds path to latest version of template
 * @param template
 */
function getLatestPath(template: string): string {
  for (const version of templateVersions) {
    if (fs.existsSync(`templates/${version}/${template}`)) {
      return `templates/${version}/${template}`;
    }
  }

  return '';
}

/**
 * Returns path to template with specified version
 * @param template - full name of the template file
 * @param messages - array into which warnings/errors will pushed
 * @param version (optional) - if not specified, latest version of the template is returned
 */
export function getPath(template: string, messages: Log[], version = ''): string {
  if (version) {
    if (fs.existsSync(`templates/${version}/${template}`)) {
      return `templates/${version}/${template}`;
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
