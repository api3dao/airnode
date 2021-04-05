import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);
import ora from 'ora';

export async function deployAirnode(airnodeIdShort, stage, cloudProvider, region) {
  const spinner = ora(`Deploying Airnode ${airnodeIdShort}-${stage} at ${cloudProvider}-${region}`).start();
  try {
    await deployServerless(airnodeIdShort, region, stage);
    spinner.succeed(`Deployed Airnode ${airnodeIdShort}-${stage} at ${cloudProvider}-${region}`);
  } catch (e) {
    spinner.fail(`Failed deploying Airnode ${airnodeIdShort}-${stage} at ${cloudProvider}-${region}`);
    throw e;
  }
}

export async function removeAirnode(airnodeIdShort, stage, cloudProvider, region) {
  const spinner = ora(`Removing Airnode ${airnodeIdShort}-${stage} at ${cloudProvider}-${region}`).start();
  try {
    await removeServerless(airnodeIdShort, region, stage);
    spinner.succeed(`Removed Airnode ${airnodeIdShort}-${stage} at ${cloudProvider}-${region}`);
  } catch (e) {
    spinner.fail(`Failed removing Airnode ${airnodeIdShort}-${stage} at ${cloudProvider}-${region}`);
    throw e;
  }
}

async function deployServerless(airnodeIdShort, region, stage) {
  await exec(`AIRNODE_ID_SHORT=${airnodeIdShort} REGION=${region} STAGE=${stage} yarn run sls:deploy`);
}

async function removeServerless(airnodeIdShort, region, stage) {
  await exec(`AIRNODE_ID_SHORT=${airnodeIdShort} REGION=${region} STAGE=${stage} yarn run sls:remove`);
}
