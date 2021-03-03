import { validateConfigSecurity } from '../validator';

if (process.env.npm_config_config || process.env.npm_config_security) {
  console.log(validateConfigSecurity(process.env.npm_config_config, process.env.npm_config_security));
} else {
  console.log(validateConfigSecurity(process.argv[2], process.argv[3]));
}
