import { validate, validateConfigSecurity } from './validate';

if (process.env.npm_config_specs || process.env.npm_config_template) {
  console.log(validate(process.env.npm_config_specs, process.env.npm_config_template));
} else if (process.env.npm_config_config || process.env.npm_config_security) {
  console.log(validateConfigSecurity(process.env.npm_config_config, process.env.npm_config_security));
} else {
  console.log(validate(process.argv[2], process.argv[3]));
}
