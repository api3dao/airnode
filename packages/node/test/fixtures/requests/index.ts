import * as apiCalls from './api-calls';
import * as apiCallTemplates from './api-call-templates';
import * as walletDesignations from './wallet-designations';
import * as withdrawals from './withdrawals';

export const requests = {
  ...apiCalls,
  ...apiCallTemplates,
  ...walletDesignations,
  ...withdrawals,
};
