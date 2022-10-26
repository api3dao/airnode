import yargs from 'yargs';
import omitBy from 'lodash/omitBy';
import { logger } from '@api3/airnode-utilities';
import { go, GoResult, goSync } from '@api3/promise-utils';
import { stopNpmRegistry, startNpmRegistry } from './npm-registry';
import { buildDockerImages } from './build-docker-images';
import { publishPackages } from './publish-packages';

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
        runCliCommand(() => {
          stopNpmRegistry();
        });
      })
      .help()
      .demandCommand(1)
      .strict();
  })
  .command(
    'publish-packages',
    'Publish NPM packages',
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
      snapshot: {
        alias: 's',
        description:
          'Publish in a snapshot mode (https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md)',
        default: false,
        type: 'boolean',
      },
    },
    (args) => {
      logger.log(`Running command '${args._[0]}' with arguments ${longArguments(args)}`);

      // Temporary check for not yet supported functionality
      if (args.npmRegistry === 'https://registry.npmjs.org/') {
        throw new Error('Publishing packages to the official NPM registry is not supported yet');
      }
      if (!args.snapshot) {
        throw new Error('Only snapshot packages are supported at the moment');
      }

      runCliCommand(() => {
        publishPackages(args.npmRegistry, args.npmTag, args.snapshot);
      });
    }
  )
  .command(
    'build-docker-images',
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
      'docker-tag': {
        alias: 'g',
        description: 'Docker tag to build the images under',
        default: 'latest',
        type: 'string',
      },
      dev: {
        alias: 'd',
        description: 'Build Docker dev images (with -dev suffix)',
        default: false,
        type: 'boolean',
      },
    },
    (args) => {
      logger.log(`Running command '${args._[0]}' with arguments ${longArguments(args)}`);
      runCliCommand(() => {
        buildDockerImages(args.npmRegistry, args.npmTag, args.dockerTag, args.dev);
      });
    }
  )
  .help()
  .demandCommand(1)
  .strict()
  .wrap(120).argv;
