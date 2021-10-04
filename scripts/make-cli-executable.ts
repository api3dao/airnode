import { chmodSync } from 'fs';

// See: https://github.com/microsoft/TypeScript/issues/37583
const addExecuteRightsMode = '755'; // default is 664
chmodSync('packages/admin/dist/bin/admin.js', addExecuteRightsMode);
chmodSync('packages/deployer/dist/bin/deployer.js', addExecuteRightsMode);
chmodSync('packages/validator/dist/bin/convertor.js', addExecuteRightsMode);
chmodSync('packages/validator/dist/bin/validator.js', addExecuteRightsMode);
