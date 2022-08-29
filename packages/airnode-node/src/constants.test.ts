import {
  WORKER_CALL_API_TIMEOUT,
  WORKER_PROCESS_TRANSACTIONS_TIMEOUT,
  WORKER_PROVIDER_INITIALIZATION_TIMEOUT,
} from './constants';

it('worker timeouts are smaller then terraform lambda timeout', () => {
  // The 32 seconds timeout is currently hardcoded in TF
  expect(WORKER_PROVIDER_INITIALIZATION_TIMEOUT).toBeLessThan(32_000);
  expect(WORKER_PROCESS_TRANSACTIONS_TIMEOUT).toBeLessThan(32_000);
  expect(WORKER_CALL_API_TIMEOUT).toBeLessThan(32_000);
});
