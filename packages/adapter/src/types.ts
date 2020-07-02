import { Method } from '@airnode/node/src/core/config/types';

export interface Options {
  oracleName: string;
  method: Method;
  path: string;
  userParameters: { [key: string]: string };
}
