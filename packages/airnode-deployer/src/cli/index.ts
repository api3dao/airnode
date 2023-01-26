import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import uniq from 'lodash/uniq';
import sortBy from 'lodash/sortBy';
import { availableCloudProviders, CloudProvider, version as getNodeVersion } from '@api3/airnode-node';
import { logger as loggerUtils } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import { deploy, removeWithReceipt, rollback } from './commands';
import * as logger from '../utils/logger';
import { longArguments } from '../utils/cli';
import { MultiMessageError } from '../utils/infrastructure';
import { deploymentInfo, fetchFiles, listAirnodes, removeAirnode } from '../infrastructure';

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

async function runCommand(command: () => Promise<any>) {
  const goCommand = await go(command);
  if (!goCommand.success) {
    logger.consoleLog('\n\n\nError details:');

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
  'deploy -c config/config.json -s config/secrets.env -r config/receipt.json -l config/logs/',
  'list --cloud-providers gcp',
  'info aws808e2a22',
  'fetch-files aws808e2a22',
  'rollback aws808e2a22 5bbcd317',
  'remove-with-receipt -r config/receipt.json',
  'remove aws808e2a22',
];

yargs(hideBin(process.argv))
  .option('debug', {
    description: 'Run in debug mode',
    default: false,
    type: 'boolean',
  })
  .option('logs', {
    alias: 'l',
    description: 'Output path for log files',
    default: 'config/logs/',
    type: 'string',
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
      drawHeader();

      logger.debugMode(args.debug as boolean);
      logger.setLogsDirectory(args.logs as string);
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
      drawHeader();

      logger.debugMode(args.debug as boolean);
      logger.setLogsDirectory(args.logs as string);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      await runCommand(() => removeWithReceipt(args.receipt));
      return;
    }
  )
  .command(
    'remove <deployment-id>',
    'Removes a deployed Airnode instance',
    (yargs) => {
      yargs.positional('deployment-id', {
        description: `ID of the deployment to remove (from 'list' command)`,
        type: 'string',
      });
    },
    async (args) => {
      drawHeader();

      logger.debugMode(args.debug as boolean);
      logger.setLogsDirectory(args.logs as string);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      await runCommand(() =>
        // Looks like due to the bug in yargs (https://github.com/yargs/yargs/issues/1649) we need to specify the type explicitely
        removeAirnode(args.deploymentId as string)
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
        default: availableCloudProviders,
        choices: availableCloudProviders,
        type: 'array',
        coerce: (option: CloudProvider['type'][]) => sortBy(uniq(option)),
      },
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.setLogsDirectory(args.logs as string);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      await listAirnodes(args.cloudProviders);
    }
  )
  .command(
    'info <deployment-id>',
    'Displays info about deployed Airnode',
    (yargs) => {
      yargs.positional('deployment-id', {
        description: `ID of the deployment to show info for (from 'list' command)`,
        type: 'string',
      });
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.setLogsDirectory(args.logs as string);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      // Looks like due to the bug in yargs (https://github.com/yargs/yargs/issues/1649) we need to specify the type explicitely
      const goDeploymentInfo = await go(() => deploymentInfo(args.deploymentId as string));
      if (!goDeploymentInfo.success) {
        logger.fail(goDeploymentInfo.error.message);
        // eslint-disable-next-line functional/immutable-data
        process.exitCode = 1;
      }
    }
  )
  .command(
    'fetch-files <deployment-id> [version-id]',
    'Fetch deployment files for the deployed Airnode',
    (yargs) => {
      yargs.positional('deployment-id', {
        description: `ID of the deployment to fetch files for (from 'list' command)`,
        type: 'string',
      });
      yargs.positional('version-id', {
        description: `ID of the deployment version to fetch files for (from 'info' command)`,
        type: 'string',
      });
      yargs.option('output-dir', {
        alias: 'o',
        description: 'Where to store fetched files',
        default: 'config/',
        type: 'string',
      });
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.setLogsDirectory(args.logs as string);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      // Looks like due to the bug in yargs (https://github.com/yargs/yargs/issues/1649) we need to specify the types explicitely
      const goFetchFiles = await go(() =>
        fetchFiles(args.deploymentId as string, args.outputDir as string, args.versionId as string | undefined)
      );
      if (!goFetchFiles.success) {
        logger.fail(goFetchFiles.error.message);
        // eslint-disable-next-line functional/immutable-data
        process.exitCode = 1;
      }
    }
  )
  .command(
    'rollback <deployment-id> <version-id>',
    'Deploy one of the previous Airnode deployment versions',
    (yargs) => {
      yargs.positional('deployment-id', {
        description: `ID of the deployment to rollback (from 'list' command)`,
        type: 'string',
      });
      yargs.positional('version-id', {
        description: `ID of the deployment version to rollback to (from 'info' command)`,
        type: 'string',
      });
      yargs.option('receipt', {
        alias: 'r',
        description: 'Output path for receipt file',
        default: 'config/receipt.json',
        type: 'string',
      });
      // Flag arguments without value are not supported. See: https://github.com/yargs/yargs/issues/1532
      yargs.option('auto-remove', {
        description: 'Enable automatic removal of deployed resources for failed deployments',
        default: true,
        type: 'boolean',
      });
    },
    async (args) => {
      logger.debugMode(args.debug as boolean);
      logger.debug(`Running command ${args._[0]} with arguments ${longArguments(args)}`);

      // Looks like due to the bug in yargs (https://github.com/yargs/yargs/issues/1649) we need to specify the types explicitely
      const goRollback = await go(() =>
        rollback(
          args.deploymentId as string,
          args.versionId as string,
          args.receipt as string,
          args.autoRemove as boolean
        )
      );
      if (!goRollback.success) {
        logger.fail(goRollback.error.message);
        // eslint-disable-next-line functional/immutable-data
        process.exitCode = 1;
      }
    }
  )
  .example(cliExamples.map((line) => [`$0 ${line}\n`]))
  .help()
  .demandCommand(1)
  .strict()
  .wrap(120).argv;
