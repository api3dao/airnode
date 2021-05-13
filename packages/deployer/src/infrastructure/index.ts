import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import ora from 'ora';
import { removeDeployment, stateExists } from './aws';

const exec = util.promisify(child.exec);
// TODO:
// Pass handler as argument
const handlerFile = path.resolve(`${__dirname}/../../.webpack/handlers/aws/index.js`);
const terraformDir = path.resolve(`${__dirname}/../../terraform`);
const terraformStateDir = `${terraformDir}/state`;
const terraformAirnodeDir = `${terraformDir}/airnode`;

export async function deployAirnode(
  airnodeIdShort: string,
  stage: string,
  cloudProvider: string,
  region: string,
  configPath: string,
  secretsPath: string
) {
  const spinner = ora(`Deploying Airnode ${airnodeIdShort} ${stage} at ${cloudProvider} ${region}`).start();
  try {
    await deploy(airnodeIdShort, stage, region, configPath, secretsPath);
    spinner.succeed(`Deployed Airnode ${airnodeIdShort} ${stage} at ${cloudProvider} ${region}`);
  } catch (e) {
    spinner.fail(`Failed deploying Airnode ${airnodeIdShort} ${stage} at ${cloudProvider} ${region}`);
    throw e;
  }
}

async function deploy(airnodeIdShort: string, stage: string, region: string, configPath: string, secretsPath: string) {
  const bucket = `airnode-${airnodeIdShort}-${stage}-terraform`;
  const dynamodbTable = `${bucket}-lock`;

  if (!(await stateExists(region, bucket, dynamodbTable))) {
    // Run state recipes
    const stateTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
    await exec(`terraform init -from-module=${terraformStateDir}`, { cwd: stateTmpDir });
    await exec(
      `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -auto-approve -input=false -no-color`,
      { cwd: stateTmpDir }
    );
  }

  // Run airnode recipes
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  await exec(
    `terraform init -from-module=${terraformAirnodeDir} -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`,
    { cwd: airnodeTmpDir }
  );
  await exec(
    `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -var="configuration_file=${path.resolve(
      configPath
    )}" -var="secrets_file=${path.resolve(
      secretsPath
    )}" -var="handler_file=${handlerFile}" -auto-approve -input=false -no-color`,
    { cwd: airnodeTmpDir }
  );
}

export async function removeAirnode(airnodeIdShort: string, stage: string, cloudProvider: string, region: string) {
  const spinner = ora(`Removing Airnode ${airnodeIdShort} ${stage} at ${cloudProvider} ${region}`).start();
  try {
    await remove(airnodeIdShort, stage, region);
    spinner.succeed(`Removed Airnode ${airnodeIdShort} ${stage} at ${cloudProvider} ${region}`);
  } catch (e) {
    spinner.fail(`Failed removing Airnode ${airnodeIdShort} ${stage} at ${cloudProvider} ${region}`);
    throw e;
  }
}

async function remove(airnodeIdShort: string, stage: string, region: string) {
  const bucket = `airnode-${airnodeIdShort}-${stage}-terraform`;
  const dynamodbTable = `${bucket}-lock`;

  // Remove airnode
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  await exec(
    `terraform init -from-module=${terraformAirnodeDir} -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`,
    { cwd: airnodeTmpDir }
  );
  await exec(
    `terraform destroy -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -var="configuration_file=X" -var="secrets_file=X" -var="handler_file=${handlerFile}" -auto-approve -input=false -no-color`,
    { cwd: airnodeTmpDir }
  );

  // Remove state
  removeDeployment(region, bucket, dynamodbTable);
}
