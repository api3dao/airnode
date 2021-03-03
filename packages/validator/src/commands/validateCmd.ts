import { validate } from '../validator';

// Find out if command with explicit arguments (--template, --specs) was called or if each argument should be interpreted based on their position
if (process.env.npm_config_specs || process.env.npm_config_template) {
  console.log(validate(process.env.npm_config_specs, process.env.npm_config_template));
} else {
  /* user called: validate [templateFile] [specsFile]
      argument          index
      templateFile      2
      specsFile         3
   */
  console.log(validate(process.argv[3], process.argv[2]));
}
