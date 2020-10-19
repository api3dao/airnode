import * as yargs from 'yargs';
import { deploy, removeMnemonic, removeAirnode } from './commands';
import { version } from '../node_modules/@airnode/node/package.json';

function drawHeader() {
  console.log(
    '  ___  _                      _      \n' +
      ' / _ \\(_)                    | |     \n' +
      '/ /_\\ \\_ _ __ _ __   ___   __| | ___ \n' +
      "|  _  | | '__| '_ \\ / _ \\ / _` |/ _ \\\n" +
      '| | | | | |  | | | | (_) | (_| |  __/\n' +
      '\\_| |_/_|_|  |_| |_|\\___/ \\__,_|\\___|'
  );
  console.log(`\n          Airnode v${version}`);
  console.log(`        Deployer CLI v${process.env.npm_package_version}\n`);
}

drawHeader();

yargs
  .command(
    'deploy',
    'Deploys Airnode and mnemonic',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      deploy(args);
    }
  )
  .command(
    'remove-mnemonic',
    'Removes mnemonic deployment',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      removeMnemonic(args);
    }
  )
  .command(
    'remove-airnode',
    'Removes Airnode deployment',
    {
      configPath: { type: 'string', demandOption: true, alias: 'c' },
      securityPath: { type: 'string', demandOption: true, alias: 's' },
    },
    (args) => {
      removeAirnode(args);
    }
  )
  .help().argv;
