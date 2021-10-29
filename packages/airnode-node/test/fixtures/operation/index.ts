import * as deployConfig from './deploy-config';
import * as requests from './requests';

export const operation = {
  ...deployConfig,
  ...requests,
};
