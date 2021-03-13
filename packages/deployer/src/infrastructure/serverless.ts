import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';

export async function deployAirnode(airnodeIdShort, region, stage) {
  const spinner = ora('Deploying the serverless functions').start();
  try {
    await deployServerless(airnodeIdShort, region, stage);
    spinner.succeed('Deployed the serverless functions');
  } catch (e) {
    spinner.fail('Failed deploying the serverless functions');
    throw e;
  }
}

export async function removeAirnode(airnodeIdShort, region, stage) {
  const spinner = ora('Removing the serverless functions').start();
  try {
    await removeServerless(airnodeIdShort, region, stage);
    spinner.succeed('Removed the serverless functions');
  } catch (e) {
    spinner.fail('Failed removing the serverless functions.');
    throw e;
  }
}

async function deployServerless(airnodeIdShort, region, stage) {
  await exec(`AIRNODE_ID_SHORT=${airnodeIdShort} REGION=${region} STAGE=${stage} yarn run sls:deploy`);
}

async function removeServerless(airnodeIdShort, region, stage) {
  await exec(`AIRNODE_ID_SHORT=${airnodeIdShort} REGION=${region} STAGE=${stage} yarn run sls:remove`);
}
