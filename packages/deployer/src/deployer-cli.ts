import * as yargs from 'yargs';
import { deploy, removeWithReceipt, remove } from './commands';
import { version as nodeVersion } from '../node_modules/@airnode/node/package.json';

function drawHeader() {
  console.log(
    '  ___  _                      _      \n' +
      ' / _ \\(_)                    | |     \n' +
      '/ /_\\ \\_ _ __ _ __   ___   __| | ___ \n' +
      "|  _  | | '__| '_ \\ / _ \\ / _` |/ _ \\\n" +
      '| | | | | |  | | | | (_) | (_| |  __/\n' +
      '\\_| |_/_|_|  |_| |_|\\___/ \\__,_|\\___|'
  );
  console.log(`\n          Airnode v${nodeVersion}`);
  console.log(`        Deployer CLI v${process.env.npm_package_version}\n`);
}

drawHeader();

yargs
  .command(
    'deploy',
    'Executes Airnode deployments specified in the config file',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      secretsPath: { type: 'string', demandOption: true, alias: 's' },
      nonStop: { boolean: true, default: false },
    },
    async (args) => {
      try {
        await deploy(args.configPath, args.secretsPath, args.nonStop, nodeVersion);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .command(
    'remove-with-receipt',
    'Removes Airnode deployment using the receipt',
    {
      receiptFilename: { type: 'string', demandOption: true, alias: 'rf' },
    },
    async (args) => {
      try {
        await removeWithReceipt(args.receiptFilename);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .command(
    'remove',
    'Removes Airnode deployment',
    {
      airnodeIdShort: { type: 'string', demandOption: true, alias: 'a' },
      stage: { type: 'string', demandOption: true, alias: 's' },
      cloudProvider: { type: 'string', demandOption: true, alias: 'c' },
      region: { type: 'string', demandOption: true, alias: 'r' },
    },
    async (args) => {
      try {
        await remove(args.airnodeIdShort, args.stage, args.cloudProvider, args.region);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .help().argv;
