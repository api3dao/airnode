import { chmodSync } from 'fs';

// See: https://github.com/microsoft/TypeScript/issues/37583
const addExecuteRightsMode = '755'; // default is 664
chmodSync('packages/airnode-admin/dist/bin/admin.js', addExecuteRightsMode);
chmodSync('packages/airnode-deployer/dist/bin/deployer.js', addExecuteRightsMode);
chmodSync('packages/airnode-validator/dist/bin/validator.js', addExecuteRightsMode);
