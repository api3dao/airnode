import * as path from 'path';
import dotenv from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from '@api3/airnode-utilities';
import { processHttpRequest } from '../handlers';
import { loadTrustedConfig } from '../config';

dotenv.config({ path: path.resolve(`${__dirname}/../../config/secrets.env`) });

yargs(hideBin(process.argv))
  .command(
    '$0',
    'Invoke HTTP data handler',
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
      logger.log(`Invoke HTTP data handler`);
      const config = loadTrustedConfig(path.resolve(`${__dirname}/../../config/config.json`), process.env);
      const parameters = JSON.parse(args.parameters);
      if (!parameters) {
        throw new Error('Missing request parameters');
      }
      logger.log(JSON.stringify(await processHttpRequest(config, args['endpoint-id'], parameters)));
    }
  )
  .help()
  .strict()
  .wrap(120).argv;
