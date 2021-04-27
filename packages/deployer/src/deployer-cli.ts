import * as yargs from 'yargs';
import { deploy, removeWithReceipt, remove } from './commands';
// TODO: Get nodeVersion from the package
const nodeVersion = '0.1.0';

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
      configPath: { alias: 'c', default: './src/config-data/config.json', type: 'string' },
      secretsPath: { alias: 's', default: './src/config-data/secrets.env', type: 'string' },
      outputFilename: { alias: 'o', default: 'receipt.json', type: 'string' },
      nonStop: { boolean: true, default: false },
    },
    async (args) => {
      try {
        await deploy(args.configPath, args.secretsPath, args.outputFilename, args.nonStop, nodeVersion);
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
      receiptFilename: { alias: 'rf', default: 'receipt.json', type: 'string' },
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
