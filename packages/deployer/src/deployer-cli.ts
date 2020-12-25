import * as yargs from 'yargs';
import {
  deployFirstTime,
  redeploy,
  deployMnemonic,
  removeWithReceipt,
  removeMnemonic,
  removeAirnode,
} from './commands';
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
    'deploy-first-time',
    'Creates a mnemonic and deploys it with Airnode',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    async (args) => {
      try {
        await deployFirstTime(args.configPath, args.securityPath, nodeVersion);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .command(
    'redeploy',
    'Redeploys Airnode with an already deployed mnemonic',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    async (args) => {
      try {
        await redeploy(args.configPath, args.securityPath, nodeVersion);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .command(
    'deploy-mnemonic',
    'Deploys a mnemonic',
    {
      mnemonic: { type: 'string', demandOption: true, alias: 'm' },
      region: { type: 'string', demandOption: true, alias: 'r' },
    },
    async (args) => {
      try {
        await deployMnemonic(args.mnemonic, args.region);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .command(
    'remove-with-receipt',
    'Removes Airnode deployment and mnemonic using the receipt',
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
    'remove-mnemonic',
    'Removes mnemonic deployment',
    {
      providerIdShort: { type: 'string', demandOption: true, alias: 'p' },
      region: { type: 'string', demandOption: true, alias: 'r' },
    },
    async (args) => {
      try {
        await removeMnemonic(args.providerIdShort, args.region);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .command(
    'remove-airnode',
    'Removes Airnode deployment',
    {
      providerIdShort: { type: 'string', demandOption: true, alias: 'p' },
      region: { type: 'string', demandOption: true, alias: 'r' },
      stage: { type: 'string', demandOption: true, alias: 's' },
    },
    async (args) => {
      try {
        await removeAirnode(args.providerIdShort, args.region, args.stage);
      } catch (e) {
        console.error(e);
        process.exitCode = 1;
      }
    }
  )
  .help().argv;
