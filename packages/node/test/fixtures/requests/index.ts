import * as apiCalls from './api-calls';
import * as apiCallTemplates from './api-call-templates';
import * as withdrawals from './withdrawals';

export const requests = {
  ...apiCalls,
  ...apiCallTemplates,
  ...withdrawals,
};
