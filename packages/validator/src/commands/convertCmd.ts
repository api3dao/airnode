import { convert, convertFromTo } from '../convertor';

if (process.env.npm_config_specs && process.env.npm_config_template) {
  console.log(convert(process.env.npm_config_specs, process.env.npm_config_template));
} else if (process.env.npm_config_from && process.env.npm_config_to && process.env.npm_config_specs) {
  console.log(convertFromTo(process.env.npm_config_from, process.env.npm_config_to, process.env.npm_config_specs));
} else {
  if (process.argv.length === 5) {
    console.log(convertFromTo(process.argv[2], process.argv[3], process.argv[4]));
  } else {
    console.log(convert(process.argv[3], process.argv[2]));
  }
}
