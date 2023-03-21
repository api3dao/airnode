import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';
import { format } from 'prettier';

if (process.argv.length < 3) {
  // eslint-disable-next-line no-console
  console.log('\nUsage: yarn update-ois <version>\n');
  process.exit(1);
}
const packageVersion = process.argv[2];

const oisJsonPatterns = ['./packages/**/*config*.json', './packages/**/ois.json'];
oisJsonPatterns.forEach((pattern) => {
  // ignore any node_modules subfolders
  const oisJson = fg.sync(pattern, { ignore: ['**/node_modules', '**/tsconfig.json'] });
  oisJson.forEach((f) => {
    // There can be multiple instances of `oisFormat` within config.json as the `ois` field value is an array.
    // Therefore, use a regex instead of parsing the JSON and updating `oisFormat` field(s).
    const ois = readFileSync(f, 'utf-8').replace(/"oisFormat": ".*"/, `"oisFormat": "${packageVersion}"`);

    // eslint-disable-next-line no-console
    console.log(`Updating "${f}" to oisFormat version ${packageVersion}`);
    writeFileSync(f, format(ois, { parser: 'json', printWidth: 120 }));
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

const packageJsonPatterns = ['./packages/**/package.json'];
packageJsonPatterns.forEach((pattern) => {
  const packageJson = fg.sync(pattern, { ignore: ['**/node_modules', '**/dist', '**/build'] });
  packageJson.forEach((f) => {
    const packageJson = JSON.parse(readFileSync(f, 'utf-8'));

    if (!packageJson.dependencies['@api3/ois']) {
      return;
    }
    // eslint-disable-next-line functional/immutable-data
    packageJson.dependencies['@api3/ois'] = packageVersion;

    // eslint-disable-next-line no-console
    console.log(`Updating "${f}" to version ${packageVersion}`);
    writeFileSync(f, JSON.stringify(packageJson, null, 2) + '\n');
  });
});
