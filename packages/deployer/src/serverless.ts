import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';

export async function deployServerless(providerIdShort) {
  const spinner = ora('Deploying the serverless functions').start();
  await exec(`sls deploy --config serverless.aws.yml --providerIdShort ${providerIdShort}`);
  await exec(`rm -f secrets.json`);
  spinner.succeed('Deployed the serverless functions');
}

export async function removeServerless(providerIdShort) {
  const spinner = ora('Removing the serverless functions').start();
  await exec(`sls remove --config serverless.aws.yml --providerIdShort ${providerIdShort}`);
  spinner.succeed('Removed the serverless functions');
}
