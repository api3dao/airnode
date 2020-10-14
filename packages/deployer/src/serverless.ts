import * as util from 'util';
import * as child from 'child_process';
const exec = util.promisify(child.exec);

export async function deployServerless(providerIdShort) {
  await exec(`sls deploy --config serverless.aws.yml --providerIdShort ${providerIdShort}`);
  await exec(`rm -f secrets.json`);
}
