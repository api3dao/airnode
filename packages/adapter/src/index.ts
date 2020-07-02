import { OIS } from '@airnode/node/src/core/config/types';
import { Options } from './types';

export function run(ois: OIS, options: Options) {
  console.log(ois, options);
}
