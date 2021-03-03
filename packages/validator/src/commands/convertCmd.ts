import { convert, convertFromTo } from '../convertor';

// Find out if command with explicit arguments (--from, --to) was called or if each argument should be interpreted based on their position
if (process.env.npm_config_specs && process.env.npm_config_template) {
  console.log(convert(process.env.npm_config_specs, process.env.npm_config_template));
} else if (process.env.npm_config_from && process.env.npm_config_to && process.env.npm_config_specs) {
  console.log(convertFromTo(process.env.npm_config_from, process.env.npm_config_to, process.env.npm_config_specs));
} else {
  // Decide which convert command was called based on number of provided arguments
  if (process.argv.length === 5) {
    /* user called: convert [from] [to] [specsFile]
      argument          index
      from              2
      to                3
      specsFile         4
     */
    console.log(convertFromTo(process.argv[2], process.argv[3], process.argv[4]));
  } else {
    /* user called: convert [templateFile] [specsFile]
      argument          index
      templateFile      2
      specsFile         3
     */
    console.log(convert(process.argv[3], process.argv[2]));
  }
}
