import _ from 'lodash';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { deploy, removeWithReceipt, remove } from './commands';
import * as logger from '../utils/logger';

// TODO: Get nodeVersion from the package
const nodeVersion = '0.1.0';

function drawHeader() {
  console.log(
    '  ___  _                      _      \n' +
      ' / _ \\(_)                    | |     \n' +
      '/ /_\\ \\_ _ __ _ __   ___   __| | ___ \n' +
      "|  _  | | '__| '_ \\ / _ \\ / _` |/ _ \\\n" +
      '| | | | | |  | | | | (_) | (_| |  __/\n' +
      '\\_| |_/_|_|  |_| |_|\\___/ \\__,_|\\___|\n'
  );
  console.log(`\n          Airnode v${nodeVersion}`);
  console.log(`        Deployer CLI v${process.env.npm_package_version}\n`);
}

async function runCommand(command: () => Promise<void>) {
  try {
    command();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

function longArguments(args: Record<string, any>) {
  return JSON.stringify(_.omitBy(args, (_, arg) => arg === '$0' || arg.length === 1));
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
        default: './src/config-data/config.json',
        type: 'string',
      },
      secrets: {
        alias: 's',
        description: 'Path to secrets file',
        default: './src/config-data/secrets.env',
        type: 'string',
      },
      receipt: {
        alias: 'r',
        description: 'Output path for receipt file',
        default: 'receipt.json',
        type: 'string',
      },
      interactive: {
        description: 'Run in interactive mode',
        boolean: true,
        default: true,
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);
      await runCommand(() => deploy(args.configuration, args.secrets, args.receipt, args.interactive, nodeVersion));
    }
  )
  .command(
    'remove',
    'Removes Airnode deployment',
    {
      receipt: {
        alias: 'r',
        description: 'Path to receipt file',
        type: 'string',
      },
      airnodeIdShort: {
        alias: 'a',
        description: 'Airnode ID (short version)',
        type: 'string',
      },
      stage: {
        alias: 's',
        description: 'Stage (environment)',
        type: 'string',
      },
      cloudProvider: {
        alias: 'c',
        description: 'Cloud provider',
        type: 'string',
      },
      region: {
        alias: 'e',
        description: 'Region',
        type: 'string',
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);
      const receiptRemove = !!args.receipt;
      const descriptiveArgs = ['airnodeIdShort', 'stage', 'cloudProvider', 'region'];
      const descriptiveArgsProvided = _.intersection(descriptiveArgs, _.keys(args));
      const descriptiveArgsMissing = _.difference(descriptiveArgs, descriptiveArgsProvided);

      if (receiptRemove && !_.isEmpty(descriptiveArgsProvided)) {
        throw "Can't mix data from receipt and data from command line arguments.";
      }

      if (receiptRemove) {
        await runCommand(() => removeWithReceipt(args.receipt!));
        return;
      }

      if (_.isEmpty(descriptiveArgsMissing)) {
        await runCommand(() => remove(args.airnodeIdShort!, args.stage!, args.cloudProvider!, args.region!));
        return;
      }

      if (!_.isEmpty(descriptiveArgsProvided)) {
        throw `Missing arguments: ${_.join(descriptiveArgsMissing, ', ')}.`;
      }

      throw `Missing arguments. You have to provide either receipt file or describe the Airnode deployment with ${_.join(
        descriptiveArgs,
        ', '
      )}.`;
    }
  )
  .help()
  .demandCommand(1)
  .strict().argv;
