import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import uniq from 'lodash/uniq';
import sortBy from 'lodash/sortBy';
import { CloudProvider, version as getNodeVersion } from '@api3/airnode-node';
import { logger as loggerUtils } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { deploy, removeWithReceipt } from './commands';
import * as logger from '../utils/logger';
import { longArguments } from '../utils/cli';
import { MultiMessageError } from '../utils/infrastructure';
import { listAirnodes, removeAirnode } from '../infrastructure';

function drawHeader() {
  loggerUtils.log(
    [
      '  ___  _                      _      ',
      ' / _ \\(_)                    | |     ',
      '/ /_\\ \\_ _ __ _ __   ___   __| | ___ ',
      "|  _  | | '__| '_ \\ / _ \\ / _` |/ _ \\",
      '| | | | | |  | | | | (_) | (_| |  __/',
      '\\_| |_/_|_|  |_| |_|\\___/ \\__,_|\\___|',
      '',
      `          Airnode v${getNodeVersion()}`,
      '',
    ].join('\n')
  );
}

async function runCommand(command: () => Promise<void>) {
  const goCommand = await go(command);
  if (!goCommand.success) {
    loggerUtils.log('\n\n\nError details:');

    // Logging an error here likely results in excessive logging since the errors are usually logged at the place where they
    // happen. However if we do not log the error here we risk having unhandled silent errors. The risk is not worth it.
    if (goCommand.error instanceof MultiMessageError) {
      goCommand.error.messages.forEach((m) => logger.fail(m));
    } else {
      logger.fail(goCommand.error.message);
    }

    // eslint-disable-next-line functional/immutable-data
    process.exitCode = 1;
  }
}

const cliExamples = [
  'deploy -c config/config.json -s config/secrets.env -r config/receipt.json',
  'list --cloud-providers gcp',
  'remove-with-receipt -r config/receipt.json',
  'remove-with-deployment-details --airnode-address 0x6abEdc0A4d1A79eD62160396456c95C5607369D3 --stage dev --cloud-provider aws --region us-east-1',
];

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
        default: 'config/receipt.json',
        type: 'string',
      },
      // Flag arguments without value are not supported. See: https://github.com/yargs/yargs/issues/1532
      'auto-remove': {
        description: 'Enable automatic removal of deployed resources for failed deployments',
        default: true,
        type: 'boolean',
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);
      await runCommand(() => deploy(args.configuration, args.secrets, args.receipt, args['auto-remove']));
    }
  )
  .command(
    'remove-with-receipt',
    'Removes a deployed Airnode instance using a receipt file',
    {
      receipt: {
        alias: 'r',
        description: 'Path to receipt file',
        default: 'config/receipt.json',
        type: 'string',
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      await runCommand(() => removeWithReceipt(args.receipt));
      return;
    }
  )
  .command(
    'remove-with-deployment-details',
    'Removes a deployed Airnode instance using the Airnode short address and cloud provider specifications',
    {
      'airnode-address': {
        alias: 'a',
        description: 'Airnode Address',
        type: 'string',
        demandOption: true,
      },
      stage: {
        alias: 's',
        description: 'Stage (environment)',
        type: 'string',
        demandOption: true,
      },
      'cloud-provider': {
        alias: 'c',
        description: 'Cloud provider',
        choices: ['aws', 'gcp'] as const,
        demandOption: true,
      },
      region: {
        alias: 'e',
        description: 'Region',
        type: 'string',
        demandOption: true,
      },
      'project-id': {
        alias: 'p',
        description: 'Project ID (required for GCP only)',
        type: 'string',
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      if (args['cloud-provider'] === 'gcp') {
        if (!args['project-id']) {
          // Throwing strings to prevent yargs from showing error stack trace
          throw `Missing required argument '--project-id' for removing a GCP deployment`;
        }
      }

      await runCommand(() =>
        removeAirnode(args['airnode-address'], args.stage, {
          type: args['cloud-provider'],
          region: args.region,
          projectId: args['project-id'],
        } as CloudProvider)
      );
      return;
    }
  )
  .command(
    'list',
    'Lists deployed Airnode instances',
    {
      'cloud-providers': {
        alias: 'c',
        description: 'Cloud providers to list Airnodes from',
        default: ['aws', 'gcp'] as const,
        choices: ['aws', 'gcp'] as const,
        type: 'array',
        coerce: (option: CloudProvider['type'][]) => sortBy(uniq(option)),
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      await listAirnodes(args.cloudProviders);
    }
  )
  .example(cliExamples.map((line) => [`$0 ${line}\n`]))
  .help()
  .demandCommand(1)
  .strict()
  .wrap(120).argv;
