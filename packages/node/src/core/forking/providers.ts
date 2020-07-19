import { fork } from './index';
import { isLocal } from './utils';

export function initialize(index: number) {
  const payload = isLocal() ? { pathParameters: { index } } : JSON.stringify({ index });

  return fork({
    functionName: 'initializeProvider',
    payload,
  });
}
