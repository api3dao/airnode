import { readFileSync, writeFileSync } from 'fs';
import fg from 'fast-glob';
import { format } from 'prettier';
import { version as packageVersion } from '../packages/airnode-node/package.json';

const configPatterns = ['./packages/**/*config.example.json', './packages/**/*config.valid.json'];
configPatterns.forEach((pattern) => {
  const exampleConfigs = fg.sync(pattern, { ignore: ['**/node_modules'] });
  exampleConfigs.forEach(async (f) => {
    const config = JSON.parse(readFileSync(f, 'utf-8'));

    // eslint-disable-next-line functional/immutable-data
    config.nodeSettings.nodeVersion = packageVersion;

    // eslint-disable-next-line no-console
    console.log(`Updating "${f}" to version ${packageVersion}`);
    const formattedConfig = await format(JSON.stringify(config, null, 2), { parser: 'json', printWidth: 120 });
    writeFileSync(f, formattedConfig);
  });
});

const receiptPatterns = ['./packages/**/*receipt.example.json', './packages/**/*receipt.valid.json'];
receiptPatterns.forEach((pattern) => {
  const exampleReceipts = fg.sync(pattern, { ignore: ['**/node_modules'] });
  exampleReceipts.forEach((f) => {
    const receipt = JSON.parse(readFileSync(f, 'utf-8'));

    // eslint-disable-next-line functional/immutable-data
    receipt.deployment.nodeVersion = packageVersion;

    // eslint-disable-next-line no-console
    console.log(`Updating "${f}" to version ${packageVersion}`);
    writeFileSync(f, JSON.stringify(receipt, null, 2) + '\n');
  });
});

// eslint-disable-next-line no-console
console.log('Done!');
