import { validate } from './validator';

if (process.env.npm_config_specs || process.env.npm_config_template) {
  console.log(validate(process.env.npm_config_specs, process.env.npm_config_template));
} else {
  console.log(validate(process.argv[3], process.argv[2]));
}
