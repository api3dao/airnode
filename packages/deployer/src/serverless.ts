import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';

export async function deployServerless(providerIdShort) {
  const spinner = ora('Deploying the serverless functions').start();
  await exec(`PROVIDER_ID_SHORT=${providerIdShort} npm run sls:deploy`);
  await exec(`rm -f secrets.json`);
  spinner.succeed('Deployed the serverless functions');
}

export async function removeServerless(providerIdShort) {
  const spinner = ora('Removing the serverless functions').start();
  await exec(`PROVIDER_ID_SHORT=${providerIdShort} npm run sls:remove`);
  spinner.succeed('Removed the serverless functions');
}
