import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';

export async function deployAirnode(providerIdShort, region, stage) {
  const spinner = ora('Deploying the serverless functions').start();
  try {
    await deployServerless(providerIdShort, region, stage);
    spinner.succeed('Deployed the serverless functions');
  } catch (e) {
    spinner.fail('Failed deploying the serverless functions');
    throw e;
  }
}

export async function removeAirnode(providerIdShort, region, stage) {
  const spinner = ora('Removing the serverless functions').start();
  try {
    await removeServerless(providerIdShort, region, stage);
    spinner.succeed('Removed the serverless functions');
  } catch (e) {
    spinner.fail('Failed removing the serverless functions.');
    throw e;
  }
}

async function deployServerless(providerIdShort, region, stage) {
  await exec(`PROVIDER_ID_SHORT=${providerIdShort} REGION=${region} STAGE=${stage} yarn sls:deploy`);
}

async function removeServerless(providerIdShort, region, stage) {
  await exec(`PROVIDER_ID_SHORT=${providerIdShort} REGION=${region} STAGE=${stage} yarn sls:remove`);
}
