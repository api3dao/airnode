import dotenv from 'dotenv';
import omitBy from 'lodash/omitBy';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as local from '../src/workers/local-handlers';

// yargs prepares the args object with both long and short version of arguments.
// This removes short versions so we can list used flags without duplicates.
function longArguments(args: Record<string, any>) {
  return JSON.stringify(omitBy(args, (_, arg) => arg === '$0' || arg.length === 1));
}

dotenv.config();

yargs(hideBin(process.argv))
  .command(
    '$0',
    'Test API calls',
    {
      'endpoint-name': {
        alias: 'e',
        description: 'Endpoint name',
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
      console.debug(`Running API test call with arguments ${longArguments(args)}`);
      const parameters = JSON.parse(args.parameters);
      if (!parameters) {
        throw new Error('Missing request parameters');
      }
      console.log(JSON.stringify(await local.testApi(args['endpoint-name'], parameters)));
    }
  )
  .help()
  .strict()
  .wrap(120).argv;
