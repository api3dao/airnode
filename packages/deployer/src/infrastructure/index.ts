import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import ora from 'ora';
import { removeDeployment, stateExists } from './aws';
import * as logger from '../utils/logger';

const exec = util.promisify(child.exec);
// TODO:
// Pass handler as argument
const handlerFile = path.resolve(`${__dirname}/../../.webpack/handlers/aws/index.js`);
const terraformDir = path.resolve(`${__dirname}/../../terraform`);
const terraformStateDir = `${terraformDir}/state`;
const terraformAirnodeDir = `${terraformDir}/airnode`;

let spinner: ora.Ora;

async function runCommand(command: string, options: child.ExecOptions) {
  const stringifiedOptions = JSON.stringify(options);
  const commandSpinner = logger.debugSpinner(`Running command '${command}' with options ${stringifiedOptions}`);
  try {
    await exec(command, options);
    commandSpinner.succeed(`Finished command '${command}' with options ${stringifiedOptions}`);
  } catch (err) {
    spinner.info();
    commandSpinner.fail(`Command '${command}' with options ${stringifiedOptions} failed`);
    logger.fail(err.toString());
    throw new Error(`Command failed: ${err.cmd}`);
  }
}

export async function deployAirnode(
  airnodeIdShort: string,
  stage: string,
  cloudProvider: string,
  region: string,
  configPath: string,
  secretsPath: string
) {
  spinner = logger.spinner(`Deploying Airnode ${airnodeIdShort} ${stage} to ${cloudProvider} ${region}`);
  try {
    await deploy(airnodeIdShort, stage, region, configPath, secretsPath);
    spinner.succeed(`Deployed Airnode ${airnodeIdShort} ${stage} to ${cloudProvider} ${region}`);
  } catch (err) {
    spinner.fail(`Failed deploying Airnode ${airnodeIdShort} ${stage} to ${cloudProvider} ${region}`);
    throw err;
  }
}

async function deploy(airnodeIdShort: string, stage: string, region: string, configPath: string, secretsPath: string) {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const bucket = `airnode-${airnodeIdShort}-${stage}-terraform`;
  const dynamodbTable = `${bucket}-lock`;

  if (!(await stateExists(region, bucket, dynamodbTable))) {
    // Run state recipes
    logger.debug('Running state Terraform recipes');
    const stateTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

    let command = `terraform init -from-module=${terraformStateDir}`;
    const options = { cwd: stateTmpDir };
    await runCommand(command, options);

    command = `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -auto-approve -input=false -no-color`;
    await runCommand(command, options);
  }

  // Run airnode recipes
  logger.debug('Running Airnode Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

  let command = `terraform init -from-module=${terraformAirnodeDir} -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`;
  const options = { cwd: airnodeTmpDir };
  await runCommand(command, options);

  command = `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -var="configuration_file=${path.resolve(
    configPath
  )}" -var="secrets_file=${path.resolve(
    secretsPath
  )}" -var="handler_file=${handlerFile}" -auto-approve -input=false -no-color`;
  await runCommand(command, options);
}

export async function removeAirnode(airnodeIdShort: string, stage: string, cloudProvider: string, region: string) {
  spinner = logger.spinner(`Removing Airnode ${airnodeIdShort} ${stage} from ${cloudProvider} ${region}`);
  try {
    await remove(airnodeIdShort, stage, region);
    spinner.succeed(`Removed Airnode ${airnodeIdShort} ${stage} from ${cloudProvider} ${region}`);
  } catch (err) {
    spinner.fail(`Failed removing Airnode ${airnodeIdShort} ${stage} from ${cloudProvider} ${region}`);
    throw err;
  }
}

async function remove(airnodeIdShort: string, stage: string, region: string) {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const bucket = `airnode-${airnodeIdShort}-${stage}-terraform`;
  const dynamodbTable = `${bucket}-lock`;

  // Remove airnode
  logger.debug('Removing Airnode via Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

  let command = `terraform init -from-module=${terraformAirnodeDir} -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`;
  const options = { cwd: airnodeTmpDir };
  await runCommand(command, options);

  command = `terraform destroy -var="aws_region=${region}" -var="airnode_id_short=${airnodeIdShort}" -var="stage=${stage}" -var="configuration_file=X" -var="secrets_file=X" -var="handler_file=${handlerFile}" -auto-approve -input=false -no-color`;
  await runCommand(command, options);

  // Remove state
  await removeDeployment(region, bucket, dynamodbTable);
}
