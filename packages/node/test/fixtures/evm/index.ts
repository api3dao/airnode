import * as apiCalls from './api-calls';
import * as withdrawals from './withdrawals';

export const evm = {
  ...apiCalls,
  ...withdrawals,
};
