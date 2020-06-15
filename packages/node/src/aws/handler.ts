import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import * as eth from '../core/eth';

export const hello: APIGatewayProxyHandler = async (event, _context) => {
  const blockNo = await eth.getCurrentBlockNumber();
  return {
    statusCode: 200,
    body: JSON.stringify({ block_number: blockNo }),
  };
};
