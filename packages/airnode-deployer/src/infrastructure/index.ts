import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import { Ora } from 'ora';
import isArray from 'lodash/isArray';
import * as aws from './aws';
import * as gcp from './gcp';
import { CloudProvider } from '../types';
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
const handlerDir = path.resolve(`${__dirname}/../../.webpack`);
const terraformDir = path.resolve(`${__dirname}/../../terraform`);
const terraformStateDir = `${terraformDir}/state`;
const terraformAirnodeDir = `${terraformDir}/airnode`;

let spinner: Ora;

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

type CommandArg = string | [string, string] | [string, string, string];

async function execTerraform(execOptions: child.ExecOptions, command: string, ...args: CommandArg[]) {
  const formattedArgs = args
    .map((arg) => {
      if (!isArray(arg)) {
        return arg;
      }

      if (arg.length === 2) {
        return `${arg[0]}=${arg[1]}`;
      }

      return `${arg[0]}="${arg[1]}=${arg[2]}"`;
    })
    .map((arg) => `-${arg}`);

  const fullCommand = `terraform ${command} ${formattedArgs.join(' ')}`;
  return await runCommand(fullCommand, execOptions);
}

function awsApplyArguments(cloudProvider: CloudProvider): CommandArg[] {
  return [['var', 'aws_region', cloudProvider.region!]];
}

function gcpApplyArguments(cloudProvider: CloudProvider): CommandArg[] {
  return [
    ['var', 'gcp_region', cloudProvider.region!],
    ['var', 'gcp_project', cloudProvider.projectId!],
  ];
}

function awsAirnodeInitArguments(cloudProvider: CloudProvider, bucket: string): CommandArg[] {
  return [
    ['backend-config', 'region', cloudProvider.region!],
    ['backend-config', 'bucket', bucket],
    ['backend-config', 'dynamodb_table', aws.awsDynamodbTableFromBucket(bucket)],
  ];
}

function gcpAirnodeInitArguments(_cloudProvider: CloudProvider, bucket: string): CommandArg[] {
  return [['backend-config', 'bucket', bucket]];
}

const cloudProviderLib = {
  aws: aws,
  gcp: gcp,
};

const cloudProviderAirnodeManageArguments = {
  aws: awsApplyArguments,
  gcp: gcpApplyArguments,
};

const cloudProviderAirnodeInitArguments = {
  aws: awsAirnodeInitArguments,
  gcp: gcpAirnodeInitArguments,
};

interface AirnodeVariables {
  airnodeAddressShort: string;
  stage: string;
  configPath?: string;
  secretsPath?: string;
  httpGatewayApiKey?: string;
}

async function terraformAirnodeManage(
  command: string,
  execOptions: child.ExecOptions,
  cloudProvider: CloudProvider,
  bucket: string,
  variables: AirnodeVariables
) {
  const terraformAirnodeCloudProviderDir = path.join(terraformAirnodeDir, cloudProvider.name);
  const { airnodeAddressShort, stage, configPath, secretsPath, httpGatewayApiKey } = variables;

  let commonArguments: CommandArg[] = [['from-module', terraformAirnodeCloudProviderDir]];
  await execTerraform(
    execOptions,
    'init',
    ...[...cloudProviderAirnodeInitArguments[cloudProvider.name](cloudProvider, bucket), ...commonArguments]
  );

  commonArguments = [
    ['var', 'airnode_address_short', airnodeAddressShort],
    ['var', 'stage', stage],
    ['var', 'configuration_file', configPath ? path.resolve(configPath) : 'NULL'],
    ['var', 'secrets_file', secretsPath ? path.resolve(secretsPath) : 'NULL'],
    ['var', 'handler_dir', handlerDir],
    ['input', 'false'],
    'no-color',
    'auto-approve',
  ];

  if (httpGatewayApiKey) {
    commonArguments.push(['var', 'api_key', httpGatewayApiKey]);
  }

  await execTerraform(
    execOptions,
    command,
    ...[...cloudProviderAirnodeManageArguments[cloudProvider.name](cloudProvider), ...commonArguments]
  );
}

export async function deployAirnode(
  airnodeAddressShort: string,
  stage: string,
  cloudProvider: CloudProvider,
  httpGatewayApiKey: string | undefined,
  configPath: string,
  secretsPath: string
) {
  const { name, region } = cloudProvider;
  spinner = logger.spinner(`Deploying Airnode ${airnodeAddressShort} ${stage} to ${name} ${region}`);
  try {
    const output = await deploy(airnodeAddressShort, stage, cloudProvider, httpGatewayApiKey, configPath, secretsPath);
    spinner.succeed(`Deployed Airnode ${airnodeAddressShort} ${stage} to ${name} ${region}`);
    return output;
  } catch (err) {
    spinner.fail(`Failed deploying Airnode ${airnodeAddressShort} ${stage} to ${name} ${region}`);
    throw err;
  }
}

async function deploy(
  airnodeAddressShort: string,
  stage: string,
  cloudProvider: CloudProvider,
  httpGatewayApiKey: string | undefined,
  configPath: string,
  secretsPath: string
): Promise<DeployAirnodeOutput> {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const { name: cloudProviderName } = cloudProvider;
  const bucket = `airnode-${airnodeAddressShort}-${stage}-terraform`;
  const terraformStateCloudProviderDir = path.join(terraformStateDir, cloudProviderName);

  if (!(await cloudProviderLib[cloudProviderName].stateExists(bucket, cloudProvider))) {
    // Run state recipes
    logger.debug('Running state Terraform recipes');
    const stateTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

    const execOptions = { cwd: stateTmpDir };
    await execTerraform(execOptions, 'init', ['from-module', terraformStateCloudProviderDir]);

    const commonArguments: CommandArg[] = [
      ['var', 'airnode_address_short', airnodeAddressShort],
      ['var', 'stage', stage],
      ['input', 'false'],
      'no-color',
      'auto-approve',
    ];
    await execTerraform(
      execOptions,
      'apply',
      ...[...cloudProviderAirnodeManageArguments[cloudProviderName](cloudProvider), ...commonArguments]
    );
  }

  // Run airnode recipes
  logger.debug('Running Airnode Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const execOptions = { cwd: airnodeTmpDir };
  await terraformAirnodeManage('apply', execOptions, cloudProvider, bucket, {
    airnodeAddressShort,
    stage,
    configPath,
    secretsPath,
    httpGatewayApiKey,
  });
  const output = await execTerraform(execOptions, 'output', 'json', 'no-color');
  const parsedOutput = JSON.parse(output) as TerraformAirnodeOutput;
  return parsedOutput.http_gateway_url ? { httpGatewayUrl: parsedOutput.http_gateway_url.value } : {};
}

export async function removeAirnode(airnodeAddressShort: string, stage: string, cloudProvider: CloudProvider) {
  const { name, region } = cloudProvider;
  spinner = logger.spinner(`Removing Airnode ${airnodeAddressShort} ${stage} from ${name} ${region}`);
  try {
    await remove(airnodeAddressShort, stage, cloudProvider);
    spinner.succeed(`Removed Airnode ${airnodeAddressShort} ${stage} from ${name} ${region}`);
  } catch (err) {
    spinner.fail(`Failed removing Airnode ${airnodeAddressShort} ${stage} from ${name} ${region}`);
    throw err;
  }
}

async function remove(airnodeAddressShort: string, stage: string, cloudProvider: CloudProvider) {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const { name: cloudProviderName } = cloudProvider;
  const bucket = `airnode-${airnodeAddressShort}-${stage}-terraform`;

  // Remove airnode
  logger.debug('Removing Airnode via Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const execOptions = { cwd: airnodeTmpDir };
  await terraformAirnodeManage('destroy', execOptions, cloudProvider, bucket, { airnodeAddressShort, stage });
  await cloudProviderLib[cloudProviderName].removeState(bucket, cloudProvider);
}
