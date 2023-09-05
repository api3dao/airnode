import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';
import compact from 'lodash/compact';
import uniq from 'lodash/uniq';
import { format } from 'prettier';

// Confirm all package.json files use the same version of @api3/ois before bumping the version
const packageJson = fg.sync('./packages/**/package.json', { ignore: ['**/node_modules', '**/dist', '**/build'] });
const versions = uniq(
  compact(
    packageJson.map((f) => {
      return JSON.parse(readFileSync(f, 'utf-8')).dependencies['@api3/ois'];
    })
  )
);
if (versions.length > 1) {
  throw new Error(`Multiple versions of @api3/ois found in packages: ${versions.join(', ')}`);
}
if (versions.length === 0) {
  throw new Error(`No version of @api3/ois found in packages`);
}
const packageVersion = versions[0];

const oisJsonPatterns = ['./packages/**/*config*.json', './packages/**/ois.json'];
oisJsonPatterns.forEach((pattern) => {
  // ignore any node_modules subfolders
  const oisJson = fg.sync(pattern, { ignore: ['**/node_modules', '**/tsconfig.json'] });
  oisJson.forEach(async (f) => {
    // There can be multiple instances of `oisFormat` within config.json as the `ois` field value is an array.
    // Therefore, use a regex instead of parsing the JSON and updating `oisFormat` field(s).
    const ois = readFileSync(f, 'utf-8').replace(/"oisFormat": ".*"/, `"oisFormat": "${packageVersion}"`);

    // eslint-disable-next-line no-console
    console.log(`Updating "${f}" to oisFormat version ${packageVersion}`);
    const formattedConfig = await format(ois, { parser: 'json', printWidth: 120 });
    writeFileSync(f, formattedConfig);
  });
});

const oisTsPatterns = ['./packages/**/create-config.ts', './packages/**/ois.ts'];
oisTsPatterns.forEach((pattern) => {
  const oisTs = fg.sync(pattern, { ignore: ['**/node_modules'] });
  oisTs.forEach((f) => {
    const ois = readFileSync(f, 'utf-8').replace(/oisFormat: '.*'/, `oisFormat: '${packageVersion}'`);

    // eslint-disable-next-line no-console
    console.log(`Updating "${f}" to oisFormat version ${packageVersion}`);
    writeFileSync(f, ois);
  });
});
