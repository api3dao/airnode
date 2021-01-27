import { convert } from '../convertor';

if (process.env.npm_config_specs || process.env.npm_config_template) {
  console.log(convert(process.env.npm_config_specs, process.env.npm_config_template));
} else {
  console.log(convert(process.argv[3], process.argv[2]));
}
