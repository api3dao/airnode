import yargs from 'yargs';
import intersection from 'lodash/intersection';
import difference from 'lodash/difference';
import keys from 'lodash/keys';
import join from 'lodash/join';
import omitBy from 'lodash/omitBy';
import isEmpty from 'lodash/isEmpty';
import uniq from 'lodash/uniq';
import { hideBin } from 'yargs/helpers';
import { version as nodeVersion } from '@api3/airnode-node';
import { deploy, removeWithReceipt, remove } from './commands';
import * as logger from '../utils/logger';
import { version as packageVersion } from '../../package.json';
import { supportedCloudProviders } from '../types';

function drawHeader() {
  console.log(
    '  ___  _                      _      \n' +
      ' / _ \\(_)                    | |     \n' +
      '/ /_\\ \\_ _ __ _ __   ___   __| | ___ \n' +
      "|  _  | | '__| '_ \\ / _ \\ / _` |/ _ \\\n" +
      '| | | | | |  | | | | (_) | (_| |  __/\n' +
      '\\_| |_/_|_|  |_| |_|\\___/ \\__,_|\\___|\n'
  );
  console.log(`\n          Airnode v${nodeVersion()}`);
  console.log(`        Deployer CLI v${packageVersion}\n`);
}

async function runCommand(command: () => Promise<void>) {
  try {
    await command();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

function longArguments(args: Record<string, any>) {
  return JSON.stringify(omitBy(args, (_, arg) => arg === '$0' || arg.length === 1));
}

function printableArguments(args: string[]) {
  return join(
    args.map((arg) => `--${arg}`),
    ', '
  );
}

drawHeader();
yargs(hideBin(process.argv))
  .option('debug', {
    description: 'Run in debug mode',
    default: false,
    type: 'boolean',
  })
  .command(
    'deploy',
    'Executes Airnode deployments specified in the config file',
    {
      configuration: {
        alias: ['c', 'config', 'conf'],
        description: 'Path to configuration file',
        default: 'config/config.json',
        type: 'string',
      },
      secrets: {
        alias: 's',
        description: 'Path to secrets file',
        default: 'config/secrets.env',
        type: 'string',
      },
      receipt: {
        alias: 'r',
        description: 'Output path for receipt file',
        default: 'output/receipt.json',
        type: 'string',
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);
      await runCommand(() => deploy(args.configuration, args.secrets, args.receipt, nodeVersion()));
    }
  )
  .command(
    'remove',
    'Removes a deployed Airnode instance',
    {
      receipt: {
        alias: 'r',
        description: 'Path to receipt file',
        type: 'string',
      },
      'airnode-address-short': {
        alias: 'a',
        description: 'Airnode Address (short version)',
        type: 'string',
      },
      stage: {
        alias: 's',
        description: 'Stage (environment)',
        type: 'string',
      },
      'cloud-provider': {
        alias: 'c',
        description: 'Cloud provider',
        choices: supportedCloudProviders,
      },
      region: {
        alias: 'e',
        description: 'Region',
        type: 'string',
      },
      'project-id': {
        alias: 'p',
        description: 'Project ID (GCP only)',
        type: 'string',
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);
      const receiptRemove = !!args.receipt;
      const descriptiveArgsCommon = ['airnode-address-short', 'stage', 'cloud-provider', 'region'];
      const descriptiveArgsCloud = {
        aws: descriptiveArgsCommon,
        gcp: [...descriptiveArgsCommon, 'project-id'],
      };
      const descriptiveArgsAll = uniq(
        Object.values(descriptiveArgsCloud).reduce((result, array) => [...result, ...array])
      );
      const argsProvided = intersection([...descriptiveArgsAll, 'receipt'], keys(args));
      const descriptiveArgsProvided = intersection(descriptiveArgsAll, keys(args));

      if (isEmpty(argsProvided)) {
        throw `Missing arguments. You have to provide either receipt file or describe the Airnode deployment with ${printableArguments(
          descriptiveArgsAll
        )}.`;
      }

      if (receiptRemove && !isEmpty(descriptiveArgsProvided)) {
        throw "Can't mix data from receipt and data from command line arguments.";
      }

      if (receiptRemove) {
        await runCommand(() => removeWithReceipt(args.receipt!));
        return;
      }

      if (!args['cloud-provider']) {
        throw "Missing argument, must provide '--cloud-provider";
      }

      const descriptiveArgsRequired = descriptiveArgsCloud[args['cloud-provider']];
      const descriptiveArgsMissing = difference(descriptiveArgsRequired, descriptiveArgsProvided);

      if (isEmpty(descriptiveArgsMissing)) {
        await runCommand(() =>
          remove(args['airnode-address-short']!.toLowerCase(), args.stage!, {
            name: args['cloud-provider']!,
            region: args.region!,
            projectId: args['project-id'],
          })
        );
        return;
      }

      if (!isEmpty(descriptiveArgsMissing)) {
        throw `Missing arguments: ${printableArguments(descriptiveArgsMissing)}.`;
      }
    }
  )
  .help()
  .demandCommand(1)
  .strict()
  .wrap(120).argv;
