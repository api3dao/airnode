import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import { Ora } from 'ora';
import { AwsCloudProvider, CloudProvider, GcpCloudProvider, HttpGateway } from '@api3/airnode-node';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import * as aws from './aws';
import * as gcp from './gcp';
import * as logger from '../utils/logger';
import { formatTerraformArguments } from '../utils/infrastructure';

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

interface CommandOptions extends child.ExecOptions {
  ignoreError?: boolean;
}

async function runCommand(command: string, options: CommandOptions) {
  const stringifiedOptions = JSON.stringify(options);
  const commandSpinner = logger.debugSpinner(`Running command '${command}' with options ${stringifiedOptions}`);
  try {
    const { stdout } = await exec(command, options);
    commandSpinner.succeed(`Finished command '${command}' with options ${stringifiedOptions}`);
    return stdout;
  } catch (err) {
    if (options.ignoreError) {
      if (logger.inDebugMode()) {
        spinner.info();
        logger.warn(`Warning: ${(err as Error).message}`);
      }
      commandSpinner.warn(`Command '${command}' with options ${stringifiedOptions} failed`);
      return '';
    }

    spinner.info();
    logger.fail((err as Error).toString());
    commandSpinner.fail(`Command '${command}' with options ${stringifiedOptions} failed`);
    throw new Error(`Command failed: ${(err as any).cmd}`);
  }
}

type CommandArg = string | [string, string] | [string, string, string];

async function execTerraform(execOptions: CommandOptions, command: string, args: CommandArg[], options?: string[]) {
  const formattedArgs = formatTerraformArguments(args);
  const fullCommand = compact(['terraform', command, formattedArgs.join(' '), options?.join(' ')]).join(' ');
  return await runCommand(fullCommand, execOptions);
}

function awsApplyArguments(cloudProvider: AwsCloudProvider): CommandArg[] {
  return [['var', 'aws_region', cloudProvider.region]];
}

function gcpApplyArguments(cloudProvider: GcpCloudProvider): CommandArg[] {
  return [
    ['var', 'gcp_region', cloudProvider.region],
    ['var', 'gcp_project', cloudProvider.projectId],
  ];
}

function awsAirnodeInitArguments(cloudProvider: AwsCloudProvider, bucket: string): CommandArg[] {
  return [
    ['backend-config', 'region', cloudProvider.region],
    ['backend-config', 'bucket', bucket],
  ];
}

function gcpAirnodeInitArguments(_cloudProvider: GcpCloudProvider, bucket: string): CommandArg[] {
  return [['backend-config', 'bucket', bucket]];
}

function awsAirnodeImportOptions(_cloudProvider: AwsCloudProvider): string[] {
  return [];
}

function gcpAirnodeImportOptions(cloudProvider: GcpCloudProvider): string[] {
  return ['module.startCoordinator.google_app_engine_application.app[0]', cloudProvider.projectId!];
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

const cloudProviderAirnodeImportOptions = {
  aws: awsAirnodeImportOptions,
  gcp: gcpAirnodeImportOptions,
};

interface AirnodeVariables {
  airnodeAddressShort: string;
  stage: string;
  configPath?: string;
  secretsPath?: string;
  httpGateway?: HttpGateway;
}

function prepareAirnodeInitArguments(cloudProvider: CloudProvider, bucket: string, commonArguments: CommandArg[]) {
  return [...cloudProviderAirnodeInitArguments[cloudProvider.type](cloudProvider as any, bucket), ...commonArguments];
}

function prepareAirnodeManageArguments(cloudProvider: CloudProvider, commonArguments: CommandArg[]) {
  return [...cloudProviderAirnodeManageArguments[cloudProvider.type](cloudProvider as any), ...commonArguments];
}

function getBucketName(airnodeAddressShort: string, stage: string) {
  return `airnode-${airnodeAddressShort}-${stage}-terraform`.toLowerCase();
}

async function terraformAirnodeManage(
  command: string,
  execOptions: child.ExecOptions,
  cloudProvider: CloudProviderExtended,
  bucket: string,
  variables: AirnodeVariables
) {
  const terraformAirnodeCloudProviderDir = path.join(terraformAirnodeDir, cloudProvider.type);
  const { airnodeAddressShort, stage, configPath, secretsPath, httpGateway } = variables;

  let commonArguments: CommandArg[] = [['from-module', terraformAirnodeCloudProviderDir]];
  await execTerraform(execOptions, 'init', prepareAirnodeInitArguments(cloudProvider, bucket, commonArguments));

  commonArguments = [
    ['var', 'airnode_address_short', airnodeAddressShort],
    ['var', 'stage', stage],
    ['var', 'configuration_file', configPath ? path.resolve(configPath) : 'NULL'],
    ['var', 'secrets_file', secretsPath ? path.resolve(secretsPath) : 'NULL'],
    ['var', 'handler_dir', handlerDir],
    ['var', 'disable_concurrency_reservation', `${!!cloudProvider.disableConcurrencyReservations}`],
    ['input', 'false'],
    'no-color',
  ];

  // In case of Airnode removal the concurrency information is not available so can't be passed as a variable
  if (cloudProvider.maxConcurrency) {
    commonArguments.push(['var', 'max_concurrency', `${cloudProvider.maxConcurrency}`]);
  }

  if (httpGateway?.enabled) {
    commonArguments.push(['var', 'api_key', httpGateway.apiKey!]);
    if (httpGateway.maxConcurrency) {
      commonArguments.push(['var', 'api_max_concurrency', `${httpGateway.maxConcurrency}`]);
    }
  }

  // Run import ONLY for an `apply` command (deployment). Do NOT run for `destroy` command (removal).
  if (command === 'apply') {
    const importOptions = cloudProviderAirnodeImportOptions[cloudProvider.type](cloudProvider as any);

    if (!isEmpty(importOptions)) {
      await execTerraform(
        { ...execOptions, ignoreError: true },
        'import',
        prepareAirnodeManageArguments(cloudProvider, commonArguments),
        cloudProviderAirnodeImportOptions[cloudProvider.type](cloudProvider as any)
      );
    }
  }

  commonArguments.push('auto-approve');

  await execTerraform(execOptions, command, prepareAirnodeManageArguments(cloudProvider, commonArguments));
}

// `maxConcurrency` field is required for deployment but missing for removal. This is the easiest way to type it.
type CloudProviderExtended = CloudProvider & {
  readonly maxConcurrency?: number;
};

interface AirnodeDeployParams {
  readonly airnodeAddressShort: string;
  readonly stage: string;
  readonly cloudProvider: CloudProviderExtended;
  readonly httpGateway: HttpGateway;
  readonly configPath: string;
  readonly secretsPath: string;
}

export async function deployAirnode(params: AirnodeDeployParams) {
  const { airnodeAddressShort, stage, cloudProvider } = params;
  const { type, region } = cloudProvider;
  spinner = logger.spinner(`Deploying Airnode ${airnodeAddressShort} ${stage} to ${type} ${region}`);
  try {
    const output = await deploy(params);
    spinner.succeed(`Deployed Airnode ${airnodeAddressShort} ${stage} to ${type} ${region}`);
    return output;
  } catch (err) {
    spinner.fail(`Failed deploying Airnode ${airnodeAddressShort} ${stage} to ${type} ${region}`);
    throw err;
  }
}

async function deploy({
  airnodeAddressShort,
  stage,
  cloudProvider,
  httpGateway,
  configPath,
  secretsPath,
}: AirnodeDeployParams): Promise<DeployAirnodeOutput> {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const { type: cloudProviderType } = cloudProvider;
  const bucket = getBucketName(airnodeAddressShort, stage);
  const terraformStateCloudProviderDir = path.join(terraformStateDir, cloudProviderType);

  if (!(await cloudProviderLib[cloudProviderType].stateExists(bucket, cloudProvider as any))) {
    // Run state recipes
    logger.debug('Running state Terraform recipes');
    const stateTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));

    const execOptions = { cwd: stateTmpDir };
    await execTerraform(execOptions, 'init', [['from-module', terraformStateCloudProviderDir]]);

    const commonArguments: CommandArg[] = [
      ['var', 'airnode_address_short', airnodeAddressShort],
      ['var', 'stage', stage],
      ['input', 'false'],
      'no-color',
      'auto-approve',
    ];
    await execTerraform(execOptions, 'apply', prepareAirnodeManageArguments(cloudProvider, commonArguments));
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
    httpGateway,
  });
  const output = await execTerraform(execOptions, 'output', ['json', 'no-color']);
  const parsedOutput = JSON.parse(output) as TerraformAirnodeOutput;
  return parsedOutput.http_gateway_url ? { httpGatewayUrl: parsedOutput.http_gateway_url.value } : {};
}

interface AirnodeRemoveParams {
  readonly airnodeAddressShort: string;
  readonly stage: string;
  readonly cloudProvider: CloudProvider;
}

export async function removeAirnode(params: AirnodeRemoveParams) {
  const { airnodeAddressShort, stage, cloudProvider } = params;
  const { type, region } = cloudProvider;
  spinner = logger.spinner(`Removing Airnode ${airnodeAddressShort} ${stage} from ${type} ${region}`);
  try {
    await remove(params);
    spinner.succeed(`Removed Airnode ${airnodeAddressShort} ${stage} from ${type} ${region}`);
  } catch (err) {
    spinner.fail(`Failed removing Airnode ${airnodeAddressShort} ${stage} from ${type} ${region}`);
    throw err;
  }
}

async function remove({ airnodeAddressShort, stage, cloudProvider }: AirnodeRemoveParams) {
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const { type: cloudProviderType } = cloudProvider;
  const bucket = getBucketName(airnodeAddressShort, stage);

  // Remove airnode
  logger.debug('Removing Airnode via Terraform recipes');
  const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
  const execOptions = { cwd: airnodeTmpDir };
  await terraformAirnodeManage('destroy', execOptions, cloudProvider, bucket, { airnodeAddressShort, stage });
  await cloudProviderLib[cloudProviderType].removeState(bucket, cloudProvider as any);
}
