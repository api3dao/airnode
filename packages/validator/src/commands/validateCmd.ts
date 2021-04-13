import { validate } from '../validator';

const fs = require('fs');

const templateVersions = fs
  .readdirSync('templates', { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => dirent.name)
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
const templates = {
  apiSpecifications: 'apiSpecifications.json',
  apiSpecs: 'apiSpecifications.json',
  config: 'config.json',
  endpoints: 'endpoints.json',
  ois: 'ois.json',
};
let template: string | undefined = process.env.npm_config_template ? process.env.npm_config_template : process.argv[2];
const specs = process.env.npm_config_specs ? process.env.npm_config_specs : process.argv[3];
const version = process.env.npm_config_templateVersion ? process.env.npm_config_templateVersion : process.argv[4];

function getLatestPath(template: string): string | undefined {
  for (const version of templateVersions) {
    if (fs.existsSync(`templates/${version}/${template}`)) {
      return `templates/${version}/${template}`;
    }
  }

  return undefined;
}

if (templates[template]) {
  if (version) {
    if (fs.existsSync(`templates/${version}/${templates[template]}`)) {
      template = `templates/${version}/${templates[template]}`;
    } else {
      console.log(`Template ${template} with version ${version} not found`);
      template = undefined;
    }
  } else {
    const tmpTemplate = template;
    template = getLatestPath(templates[template]);

    if (!template) {
      console.log(`Template for ${tmpTemplate} not found`);
    }
  }
} else if (version) {
  console.log(`Version argument will be ignored when validating provided template file`);
}

if (specs && template) {
  console.log(validate(specs, template));
}
