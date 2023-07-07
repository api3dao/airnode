import yargs from 'yargs';
import omitBy from 'lodash/omitBy';
import { logger } from '@api3/airnode-utilities';
import { go, GoResult, goSync } from '@api3/promise-utils';
import { stopNpmRegistry, startNpmRegistry } from './npm-registry';
import { buildDockerImages, publishDockerImages } from './docker';
import { disableMerge, enableMerge } from './github';
import { openPullRequest, publish, publishSnapshot } from './npm';
import { isAirnodeMounted } from './utils';

// Taken from airnode-deployer
const longArguments = (args: Record<string, any>) => {
  return JSON.stringify(omitBy(args, (_, arg) => arg === '$0' || arg.length === 1));
};

const handleCliCommand = (result: GoResult<void, Error>) => {
  if (!result.success) {
    logger.error(result.error.message);
    // eslint-disable-next-line functional/immutable-data
    process.exitCode = 1;
  }
};

const runAsyncCliCommand = async (command: () => Promise<void>) => {
  const goCommand = await go(command);
  handleCliCommand(goCommand);
};

const runCliCommand = (command: () => void) => {
  const goCommand = goSync(command);
  handleCliCommand(goCommand);
};

yargs(process.argv.slice(2))
  .parserConfiguration({
    'parse-numbers': false,
  })
  .command('npm-registry', 'Manages the local NPM registry', (yargs) => {
    yargs
      .command('start', 'Start the local NPM registry', {}, (args) => {
        logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
        runAsyncCliCommand(async () => {
          const npmRegistryInfo = await startNpmRegistry();
          logger.log('');
          logger.log(`NPM registry container name: ${npmRegistryInfo.npmRegistryContainerName}`);
          logger.log(`NPM registry URL: ${npmRegistryInfo.npmRegistryUrl}`);
        });
      })
      .command('stop', 'Stop the local NPM registry', {}, (args) => {
        logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
        runCliCommand(() => stopNpmRegistry());
      })
      .help()
      .demandCommand(1)
      .strict();
  })
  .command('npm', 'Manages publishing of NPM packages', (yargs) => {
    yargs
      .command(
        'publish-snapshot',
        'Publish snapshot NPM packages',
        {
          'npm-registry': {
            alias: 'r',
            description: 'NPM registry URL to publish to or a keyword `local` to use a local NPM registry',
            default: 'https://registry.npmjs.org/',
            type: 'string',
          },
          'npm-tag': {
            alias: 't',
            description: 'NPM tag to publish the packages under',
            default: 'latest',
            type: 'string',
          },
          'release-branch': {
            alias: 'b',
            description: 'Branch, from which are the packages released',
            type: 'string',
          },
        },
        (args) => {
          logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);

          const airnodeMounted = isAirnodeMounted();
          if (!airnodeMounted && !args.releaseBranch) {
            handleCliCommand({
              success: false,
              error: new Error('Either provide the release Git branch or mount the Airnode source code directory'),
              data: undefined,
            });
            return;
          }
          if (airnodeMounted && args.releaseBranch) {
            handleCliCommand({
              success: false,
              error: new Error(
                `Can't provide the release Git branch and mount the Airnode source code directory at the same time`
              ),
              data: undefined,
            });
            return;
          }

          runAsyncCliCommand(() => publishSnapshot(args.npmRegistry, args.npmTag, args.releaseBranch));
        }
      )
      .command(
        'pull-request',
        'Create a release GitHub pull-request',
        {
          'release-version': {
            alias: 'v',
            description: 'Release version for which should be the pull-request opened',
            type: 'string',
            demandOption: true,
          },
          'head-branch': {
            alias: 'h',
            description: 'Branch from which should be the pull-request opened',
            type: 'string',
            demandOption: true,
          },
          'base-branch': {
            alias: 'b',
            description: 'Branch against which should be the pull-request opened',
            type: 'string',
            demandOption: true,
          },
        },
        (args) => {
          logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
          runAsyncCliCommand(() => openPullRequest(args.releaseVersion, args.headBranch, args.baseBranch));
        }
      )
      .command(
        'publish',
        'Publish NPM package from the release branch',
        {
          'npm-registry': {
            alias: 'r',
            description: 'NPM registry URL to publish to or a keyword `local` to use a local NPM registry',
            default: 'https://registry.npmjs.org/',
            type: 'string',
          },
          'npm-tags': {
            alias: 't',
            description: 'NPM tags to publish the packages under',
            default: ['latest'],
            type: 'array',
          },
          'release-branch': {
            alias: 'b',
            description: 'Branch, from which are the packages released',
            type: 'string',
            demandOption: true,
          },
        },
        (args) => {
          logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
          runCliCommand(() => publish(args.npmRegistry, args.npmTags as string[], args.releaseBranch));
        }
      )
      .help()
      .demandCommand(1)
      .strict();
  })
  .command('docker', 'Manages Docker images', (yargs) => {
    yargs
      .command(
        'build',
        'Build Docker images',
        {
          'npm-registry': {
            alias: 'r',
            description: 'NPM registry URL to fetch packages from or a keyword `local` to use a local NPM registry',
            default: 'https://registry.npmjs.org/',
            type: 'string',
          },
          'npm-tag': {
            alias: 't',
            description: 'NPM tag/version of the packages that will be fetched',
            default: 'latest',
            type: 'string',
          },
          'docker-tags': {
            alias: 'g',
            description: 'Docker tags to build the images under',
            default: ['latest'],
            type: 'array',
          },
          dev: {
            alias: 'd',
            description: 'Build Docker dev images (with -dev suffix)',
            default: false,
            type: 'boolean',
          },
        },
        (args) => {
          logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
          runCliCommand(() => buildDockerImages(args.npmRegistry, args.npmTag, args.dockerTags as string[], args.dev));
        }
      )
      .command(
        'publish',
        'Publish Docker images',
        {
          'docker-tags': {
            alias: 'g',
            description: 'Docker tags to publish',
            default: ['latest'],
            type: 'array',
          },
          dev: {
            alias: 'd',
            description: 'Publish Docker dev images (with -dev suffix)',
            default: false,
            type: 'boolean',
          },
        },
        (args) => {
          logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
          runCliCommand(() => publishDockerImages(args.dockerTags as string[], args.dev));
        }
      )
      .help()
      .demandCommand(1)
      .strict();
  })
  .command('github', 'Manages GitHub PR merging', (yargs) => {
    yargs
      .command('enable-merge', 'Enables PR merging', {}, (args) => {
        logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
        runAsyncCliCommand(() => enableMerge());
      })
      .command('disable-merge', 'Disables PR merging', {}, (args) => {
        logger.log(`Running command '${args._[0]} ${args._[1]}' with arguments ${longArguments(args)}`);
        runAsyncCliCommand(() => disableMerge());
      })
      .help()
      .demandCommand(1)
      .strict();
  })
  .help()
  .demandCommand(1)
  .strict()
  .wrap(120).argv;
