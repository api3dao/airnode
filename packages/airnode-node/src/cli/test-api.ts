import * as path from 'path';
import dotenv from 'dotenv';
import omitBy from 'lodash/omitBy';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { log } from '@api3/airnode-utilities';
import * as local from '../workers/local-handlers';

// yargs prepares the args object with both long and short version of arguments.
// This removes short versions so we can list used flags without duplicates.
function longArguments(args: Record<string, any>) {
  return JSON.stringify(omitBy(args, (_, arg) => arg === '$0' || arg.length === 1));
}

dotenv.config({ path: path.resolve(`${__dirname}/../../config/secrets.env`) });

yargs(hideBin(process.argv))
  .command(
    '$0',
    'Test API calls',
    {
      'endpoint-id': {
        alias: 'e',
        description: 'The ID of the endpoint to be tested, which is derived from the OIS title and endpoint name',
        type: 'string',
        required: true,
      },
      parameters: {
        alias: 'p',
        description: 'Request parameters',
        default: '{}',
        type: 'string',
      },
    },
    async (args) => {
      log(`Running API test call with arguments ${longArguments(args)}`);
      const parameters = JSON.parse(args.parameters);
      if (!parameters) {
        throw new Error('Missing request parameters');
      }
      log(JSON.stringify(await local.testApi(args['endpoint-id'], parameters)));
    }
  )
  .help()
  .strict()
  .wrap(120).argv;
