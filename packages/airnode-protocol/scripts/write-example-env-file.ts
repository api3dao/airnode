import * as fs from 'fs';
import * as api3Chains from '@api3/chains';

fs.writeFileSync(
  'example.env',
  api3Chains.getEnvVariables().reduce((fileContents: string, envVariableName: string) => {
    return fileContents + `${envVariableName}=""\n`;
  }, '')
);
