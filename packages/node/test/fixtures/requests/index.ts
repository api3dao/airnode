import * as apiCalls from './api-calls';
import * as withdrawals from './withdrawals';

export const requests = {
  ...apiCalls,
  ...withdrawals,
};
