import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import ora from 'ora';
import { removeDeployment } from './aws';

const exec = util.promisify(child.exec);
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

  // Run state recipes
  await exec(`terraform init`, { cwd: terraformStateDir });
  await exec(
    `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -auto-approve -input=false -no-color`,
    { cwd: terraformStateDir }
  );

  // Run airnode recipes
  await exec(
    `terraform init -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`,
    { cwd: terraformAirnodeDir }
  );
  await exec(
    `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -var="configuration_file=${path.resolve(
      configPath
    )}" -var="secrets_file=${path.resolve(secretsPath)}" -auto-approve -input=false -no-color`,
    { cwd: terraformAirnodeDir }
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
  await exec(
    `terraform init -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`,
    { cwd: terraformAirnodeDir }
  );
  await exec(
    `terraform destroy -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -var="configuration_file=X" -var="secrets_file=X" -auto-approve -input=false -no-color`,
    { cwd: terraformAirnodeDir }
  );

  // Remove state
  removeDeployment(region, bucket, dynamodbTable);
}
