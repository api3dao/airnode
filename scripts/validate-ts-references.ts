import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse as parseJsonWithComments } from 'comment-json';

const toPrettyJson = (value: unknown) => JSON.stringify(value, null, 2);

const packagesDir = join(__dirname, '../packages');
const packageNames = readdirSync(packagesDir, { withFileTypes: true })
  .filter(
    // Only folders starting with "airnode-" are packages, other files should be ignored
    (dirent) => dirent.isDirectory() && dirent.name.startsWith('airnode-')
  )
  .map((dirent) => dirent.name);

packageNames.forEach((packageName) => {
  const packageDir = join(packagesDir, packageName);
  const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'));
  const dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies });
  const monorepoDependencies = dependencies.filter(
    (dependency) => dependency.startsWith('@api3/') && packageNames.includes(dependency.replace('@api3/', ''))
  );

  const packageTsConfig: any = parseJsonWithComments(
    readFileSync(join(packageDir, 'tsconfig.json'), 'utf-8'),
    undefined,
    true
  );
  const refs: string[] = packageTsConfig.references.map((ref: any) => ref.path);
  const monorepoReferences = refs
    .map((ref) => {
      const tsConfig: any = parseJsonWithComments(
        readFileSync(join(packageDir, ref, 'tsconfig.json'), 'utf-8'),
        undefined,
        true
      );
      const tsConfigReferences: string[] = (tsConfig.references ?? []).map((reference: any) => reference.path);
      return tsConfigReferences.filter((reference) => reference.startsWith('../../'));
    })
    .reduce((acc, tsConfigRefs) => [...acc, ...tsConfigRefs], []);

  if (monorepoDependencies.length !== monorepoReferences.length) {
    throw new Error(
      [
        `Package ${packageName} has wrong number of TS references.`,
        `Dependencies:`,
        `${toPrettyJson(monorepoDependencies)}`,
        `References:`,
        `${toPrettyJson(monorepoReferences)}`,
      ].join('\n')
    );
  }

  monorepoDependencies.forEach((dependency) => {
    const tsReference = monorepoReferences.find(
      (reference) => reference === '../../' + dependency.replace('@api3/', '') + '/src'
    );
    if (!tsReference) {
      throw new Error(`Package ${packageName} has no TS reference found for dependency ${dependency}.`);
    }
  });
});
