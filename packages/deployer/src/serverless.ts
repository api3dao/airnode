import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);

export async function deployServerless() {
  await exec(`sls deploy --config serverless.aws.yml`);
  await exec(`rm -f secrets.json`);
}
