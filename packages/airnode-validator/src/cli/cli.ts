import path from 'path';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { goSync } from '@api3/promise-utils';
import ora from 'ora';
import * as dotenv from 'dotenv';
import { parseConfigWithSecrets } from '../api';

export const succeed = (s: string) => ora(s).succeed();
export const fail = (s: string) => {
  ora(s).fail();
  process.exit(1);
};

const examples = [
  '--config pathTo/config.json --secrets pathTo/secrets.env',
  '-c pathTo/config.json -s pathTo/secrets.env',
];

export const validateConfiguration = (configPath: string, secretsPath: string) => {
  const goRawConfig = goSync(() => readFileSync(path.resolve(configPath), 'utf-8'));
  if (!goRawConfig.success)
    return fail(`Unable to read config file at "${configPath}". Reason: ${goRawConfig.error.message}`);

  const goConfig = goSync(() => JSON.parse(goRawConfig.data));
  if (!goConfig.success) return fail(`The configuration is not a valid JSON.`);

  const goRawSecrets = goSync(() => readFileSync(path.resolve(secretsPath), 'utf-8'));
  if (!goRawSecrets.success) {
    return fail(`Unable to read secrets file at "${secretsPath}". Reason: ${goRawSecrets.error.message}`);
  }

  const goSecrets = goSync(() => dotenv.parse(goRawSecrets.data));
  if (!goSecrets.success) return fail(`The secrets have incorrect format.`);

  const parseResult = parseConfigWithSecrets(goConfig.data, goSecrets.data);
  if (!parseResult.success) return fail(`The configuration is not valid. Reason: ${parseResult.error.message}`);

  return succeed('The configuration is valid');
};

export const cli = () => {
  const cliArguments = yargs(hideBin(process.argv))
    .option('config', {
      description: 'Path to "config.json" file to validate',
      alias: 'c',
      type: 'string',
      demandOption: true,
    })
    .option('secrets', {
      description: 'Path to "secrets.env" file to interpolate in the config',
      alias: 's',
      type: 'string',
      // Making the secrets file required. If the users do not use a secrets file they can pass any empty file. However,
      // not passing a secrets file is not recommended and usually is a mistake.
      demandOption: true,
    })
    .strict()
    .help()
    .wrap(120)
    .example(examples.map((e) => [e]))
    .parseSync();

  const { config, secrets } = cliArguments;
  validateConfiguration(config, secrets);
};
