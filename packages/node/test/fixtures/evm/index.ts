import * as apiCalls from './api-calls';
import * as logs from './event-logs';
import * as withdrawals from './withdrawals';

export const evm = {
  logs,
  ...apiCalls,
  ...withdrawals,
};
