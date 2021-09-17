import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import ora from 'ora';
import { removeDeployment, stateExists } from './aws';
import * as logger from '../utils/logger';

type TerraformAirnodeOutput = {
  http_gateway_url?: {
    value: string;
  };
};

export type DeployAirnodeOutput = {
  httpGatewayUrl?: string;
};

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
    const { stdout } = await exec(command, options);
    commandSpinner.succeed(`Finished command '${command}' with options ${stringifiedOptions}`);
    return stdout;
  } catch (err) {
    spinner.info();
    commandSpinner.fail(`Command '${command}' with options ${stringifiedOptions} failed`);
    logger.fail((err as Error).toString());
    throw new Error(`Command failed: ${(err as any).cmd}`);
  }
}

export async function deployAirnode(
  airnodeAddressShort: string,
  stage: string,
  cloudProvider: string,
  region: string,
  httpGatewayApiKey: string | undefined,
  configPath: string,
  secretsPath: string
) {
  spinner = logger.spinner(`Deploying Airnode ${airnodeAddressShort} ${stage} to ${cloudProvider} ${region}`);
  try {
    const output = await deploy(airnodeAddressShort, stage, region, httpGatewayApiKey, configPath, secretsPath);
    spinner.succeed(`Deployed Airnode ${airnodeAddressShort} ${stage} to ${cloudProvider} ${region}`);
    return output;
  } catch (err) {
    spinner.fail(`Failed deploying Airnode ${airnodeAddressShort} ${stage} to ${cloudProvider} ${region}`);
    throw err;
  }
}

async function deploy(
  airnodeAddressShort: string,
  stage: string,
  region: string,
  httpGatewayApiKey: string | undefined,
  configPath: string,
  secretsPath: string
): Promise<DeployAirnodeOutput> {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const bucket = `airnode-${airnodeAddressShort}-${stage}-terraform`;
  const dynamodbTable = `${bucket}-lock`;

  if (!(await stateExists(region, bucket, dynamodbTable))) {
    // Run state recipes
    logger.debug('Running state Terraform recipes');
    const stateTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

    let command = `terraform init -from-module=${terraformStateDir}`;
    const options = { cwd: stateTmpDir };
    await runCommand(command, options);

    command = `terraform apply -var="aws_region=${region}" -var="airnode_address_short=${airnodeAddressShort}" -var="stage=${stage}" -auto-approve -input=false -no-color`;
    await runCommand(command, options);
  }

  // Run airnode recipes
  logger.debug('Running Airnode Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

  let command = `terraform init -from-module=${terraformAirnodeDir} -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`;
  const options = { cwd: airnodeTmpDir };
  await runCommand(command, options);

  const httpGatewayApiKeyVar = httpGatewayApiKey ? `-var='api_key=${httpGatewayApiKey}'` : '';
  command = `terraform apply -var="aws_region=${region}" -var="airnode_id_short=${airnodeAddressShort}" -var="stage=${stage}" -var="configuration_file=${path.resolve(
    configPath
  )}" -var="secrets_file=${path.resolve(
    secretsPath
  )}" -var="handler_file=${handlerFile}" ${httpGatewayApiKeyVar} -auto-approve -input=false -no-color`;
  await runCommand(command, options);

  command = 'terraform output -json -no-color';
  const output: TerraformAirnodeOutput = JSON.parse(await runCommand(command, options));
  return output.http_gateway_url ? { httpGatewayUrl: output.http_gateway_url.value } : {};
}

export async function removeAirnode(airnodeAddressShort: string, stage: string, cloudProvider: string, region: string) {
  spinner = logger.spinner(`Removing Airnode ${airnodeAddressShort} ${stage} from ${cloudProvider} ${region}`);
  try {
    await remove(airnodeAddressShort, stage, region);
    spinner.succeed(`Removed Airnode ${airnodeAddressShort} ${stage} from ${cloudProvider} ${region}`);
  } catch (err) {
    spinner.fail(`Failed removing Airnode ${airnodeAddressShort} ${stage} from ${cloudProvider} ${region}`);
    throw err;
  }
}

async function remove(airnodeAddressShort: string, stage: string, region: string) {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const bucket = `airnode-${airnodeAddressShort}-${stage}-terraform`;
  const dynamodbTable = `${bucket}-lock`;

  // Remove airnode
  logger.debug('Removing Airnode via Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

  let command = `terraform init -from-module=${terraformAirnodeDir} -backend-config="region=${region}" -backend-config="bucket=${bucket}" -backend-config="dynamodb_table=${dynamodbTable}"`;
  const options = { cwd: airnodeTmpDir };
  await runCommand(command, options);

  command = `terraform destroy -var="aws_region=${region}" -var="airnode_address_short=${airnodeAddressShort}" -var="stage=${stage}" -var="configuration_file=X" -var="secrets_file=X" -var="handler_file=${handlerFile}" -auto-approve -input=false -no-color`;
  await runCommand(command, options);

  // Remove state
  await removeDeployment(region, bucket, dynamodbTable);
}
