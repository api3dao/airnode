import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import {
  AwsCloudProvider,
  CloudProvider,
  GcpCloudProvider,
  Config,
  evm,
  availableCloudProviders,
} from '@api3/airnode-node';
import { consoleLog } from '@api3/airnode-utilities';
import { go } from '@api3/promise-utils';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import omitBy from 'lodash/omitBy';
import isNil from 'lodash/isNil';
import sortBy from 'lodash/sortBy';
import Table from 'cli-table3';
import * as aws from './aws';
import * as gcp from './gcp';
import * as logger from '../utils/logger';
import {
  logAndReturnError,
  formatTerraformArguments,
  getStageDirectory,
  getAddressDirectory,
  Directory,
  FileSystemType,
  deploymentComparator,
} from '../utils/infrastructure';
import { version as nodeVersion } from '../../package.json';
import { deriveAirnodeAddress, shortenAirnodeAddress } from '../utils';
import {
  airnodeAddressReadable,
  cloudProviderReadable,
  hashDeployment,
  hashDeploymentVersion,
  timestampReadable,
} from '../utils/cli';

export const TF_STATE_FILENAME = 'default.tfstate';

type TerraformAirnodeOutput = {
  http_gateway_url?: {
    value: string;
  };
  http_signed_data_gateway_url?: {
    value: string;
  };
};

export type DeployAirnodeOutput = {
  httpGatewayUrl?: string;
  httpSignedDataGatewayUrl?: string;
};

const exec = util.promisify(child.exec);

const handlerDir = path.resolve(`${__dirname}/../../.webpack`);
const terraformDir = path.resolve(`${__dirname}/../../terraform`);

interface CommandOptions extends child.ExecOptions {
  ignoreError?: boolean;
}

export async function runCommand(command: string, options: CommandOptions) {
  const stringifiedOptions = JSON.stringify(options);
  const commandSpinner = logger.debugSpinner(`Running command '${command}' with options ${stringifiedOptions}`);

  const goExec = await go(() => exec(command, options));
  if (!goExec.success) {
    if (options.ignoreError) {
      if (logger.inDebugMode()) {
        logger.getSpinner().info();
        logger.warn(`Warning: ${goExec.error.message}`);
      }
      commandSpinner.warn(`Command '${command}' with options ${stringifiedOptions} failed`);
      return '';
    }

    logger.getSpinner().info();
    commandSpinner.fail(`Command '${command}' with options ${stringifiedOptions} failed`);
    throw logAndReturnError(goExec.error.toString());
  }

  commandSpinner.succeed(`Finished command '${command}' with options ${stringifiedOptions}`);
  return goExec.data.stdout;
}

export type CommandArg = string | [string, string] | [string, string, string];

export function execTerraform(execOptions: CommandOptions, command: string, args: CommandArg[], options?: string[]) {
  const formattedArgs = formatTerraformArguments(args);
  const fullCommand = compact(['terraform', command, formattedArgs.join(' '), options?.join(' ')]).join(' ');
  return runCommand(fullCommand, execOptions);
}

export function awsApplyDestroyArguments(
  cloudProvider: AwsCloudProvider,
  _bucket: string,
  _path: string
): CommandArg[] {
  return [['var', 'aws_region', cloudProvider.region]];
}

export function gcpApplyDestroyArguments(cloudProvider: GcpCloudProvider, bucket: string, path: string): CommandArg[] {
  return [
    ['var', 'gcp_region', cloudProvider.region],
    ['var', 'gcp_project', cloudProvider.projectId],
    ['var', 'airnode_bucket', bucket],
    ['var', 'deployment_bucket_dir', path],
  ];
}

export function awsAirnodeInitArguments(cloudProvider: AwsCloudProvider, bucket: string, path: string): CommandArg[] {
  return [
    ['backend-config', 'region', cloudProvider.region],
    ['backend-config', 'bucket', bucket],
    // This is the filename used by GCP and can't be configured there. Using it here as well to keep it consistent.
    ['backend-config', 'key', `${path}/${TF_STATE_FILENAME}`],
  ];
}

export function gcpAirnodeInitArguments(_cloudProvider: GcpCloudProvider, bucket: string, path: string): CommandArg[] {
  return [
    ['backend-config', 'bucket', bucket],
    ['backend-config', 'prefix', path],
  ];
}

export function awsAirnodeImportOptions(_cloudProvider: AwsCloudProvider): string[] {
  return [];
}

export function gcpAirnodeImportOptions(cloudProvider: GcpCloudProvider): string[] {
  return ['module.startCoordinator.google_app_engine_application.app[0]', cloudProvider.projectId];
}

const cloudProviderLib = {
  aws: aws,
  gcp: gcp,
};

export const cloudProviderAirnodeApplyDestoryArguments = {
  aws: awsApplyDestroyArguments,
  gcp: gcpApplyDestroyArguments,
};

export const cloudProviderAirnodeInitArguments = {
  aws: awsAirnodeInitArguments,
  gcp: gcpAirnodeInitArguments,
};

export const cloudProviderAirnodeImportOptions = {
  aws: awsAirnodeImportOptions,
  gcp: gcpAirnodeImportOptions,
};

export function prepareAirnodeInitArguments(
  cloudProvider: CloudProvider,
  bucket: string,
  path: string,
  commonArguments: CommandArg[]
) {
  return [
    ...cloudProviderAirnodeInitArguments[cloudProvider.type](cloudProvider as any, bucket, path),
    ...commonArguments,
  ];
}

export function prepareCloudProviderAirnodeApplyDestoryArguments(
  cloudProvider: CloudProvider,
  bucket: string,
  path: string,
  commonArguments: CommandArg[]
) {
  return [
    ...cloudProviderAirnodeApplyDestoryArguments[cloudProvider.type](cloudProvider as any, bucket, path),
    ...commonArguments,
  ];
}

export type AirnodeApplyDestroyVariables = {
  airnodeAddressShort: string;
  stage: string;
  configPath?: string;
  secretsPath?: string;
  handlerDir: string;
  disableConcurrencyReservations: boolean;
  airnodeWalletPrivateKey?: string;
};

export function prepareAirnodeApplyDestroyArguments(variables: AirnodeApplyDestroyVariables): CommandArg[] {
  const {
    airnodeAddressShort,
    stage,
    configPath,
    secretsPath,
    handlerDir,
    disableConcurrencyReservations,
    airnodeWalletPrivateKey,
  } = variables;

  return [
    ['var', 'airnode_address_short', airnodeAddressShort],
    ['var', 'stage', stage],
    ['var', 'configuration_file', configPath ? path.resolve(configPath) : 'NULL'],
    ['var', 'secrets_file', secretsPath ? path.resolve(secretsPath) : 'NULL'],
    ['var', 'handler_dir', handlerDir],
    ['var', 'disable_concurrency_reservation', `${!!disableConcurrencyReservations}`],
    ['var', 'airnode_wallet_private_key', airnodeWalletPrivateKey ? airnodeWalletPrivateKey : 'NULL'],
    ['input', 'false'],
    'no-color',
  ];
}

export async function terraformAirnodeInit(
  execOptions: child.ExecOptions,
  cloudProvider: CloudProvider,
  bucket: string,
  bucketPath: string
) {
  const terraformCloudProviderDirectory = path.join(terraformDir, cloudProvider.type);

  const commonArguments: CommandArg[] = [['from-module', terraformCloudProviderDirectory]];
  await execTerraform(
    execOptions,
    'init',
    prepareAirnodeInitArguments(cloudProvider, bucket, bucketPath, commonArguments)
  );
}

export async function terraformAirnodeApply(
  execOptions: child.ExecOptions,
  config: Config,
  bucket: string,
  bucketPath: string,
  configPath: string,
  secretsPath: string
) {
  const { airnodeWalletMnemonic, stage, httpGateway, httpSignedDataGateway } = config.nodeSettings;
  const cloudProvider = config.nodeSettings.cloudProvider as CloudProvider;
  const airnodeAddressShort = shortenAirnodeAddress(deriveAirnodeAddress(airnodeWalletMnemonic));
  const airnodeWalletPrivateKey = evm.getAirnodeWallet(config).privateKey;
  const maxConcurrency = config.chains.reduce((concurrency: number, chain) => concurrency + chain.maxConcurrency, 0);

  await terraformAirnodeInit(execOptions, cloudProvider, bucket, bucketPath);

  const commonArguments = prepareAirnodeApplyDestroyArguments({
    airnodeAddressShort,
    stage,
    configPath,
    secretsPath,
    handlerDir,
    disableConcurrencyReservations: cloudProvider.disableConcurrencyReservations,
    airnodeWalletPrivateKey,
  });
  commonArguments.push(['var', 'max_concurrency', `${maxConcurrency}`]);

  if (httpGateway?.enabled) {
    commonArguments.push(['var', 'http_api_key', httpGateway.apiKey!]);
    if (httpGateway.maxConcurrency) {
      commonArguments.push(['var', 'http_max_concurrency', `${httpGateway.maxConcurrency}`]);
    }
  }

  if (httpSignedDataGateway?.enabled) {
    commonArguments.push(['var', 'http_signed_data_api_key', httpSignedDataGateway.apiKey!]);
    if (httpSignedDataGateway.maxConcurrency) {
      commonArguments.push(['var', 'http_signed_data_max_concurrency', `${httpSignedDataGateway.maxConcurrency}`]);
    }
  }

  const importOptions = cloudProviderAirnodeImportOptions[cloudProvider.type](cloudProvider as any);
  if (!isEmpty(importOptions)) {
    await execTerraform(
      { ...execOptions, ignoreError: true },
      'import',
      prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, bucketPath, commonArguments),
      cloudProviderAirnodeImportOptions[cloudProvider.type](cloudProvider as any)
    );
  }

  commonArguments.push('auto-approve');

  await execTerraform(
    execOptions,
    'apply',
    prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, bucketPath, commonArguments)
  );
}

export function transformTerraformOutput(terraformOutput: string): DeployAirnodeOutput {
  const parsedOutput = JSON.parse(terraformOutput) as TerraformAirnodeOutput;
  return omitBy(
    {
      httpGatewayUrl: parsedOutput.http_gateway_url?.value,
      httpSignedDataGatewayUrl: parsedOutput.http_signed_data_gateway_url?.value,
    },
    isNil
  );
}

export const deployAirnode = async (config: Config, configPath: string, secretsPath: string, timestamp: number) => {
  const { airnodeWalletMnemonic, cloudProvider, stage } = config.nodeSettings;
  const airnodeAddress = deriveAirnodeAddress(airnodeWalletMnemonic);
  const { type, region } = cloudProvider as CloudProvider;

  const spinner = logger.getSpinner().start(`Deploying Airnode ${airnodeAddress} ${stage} to ${type} ${region}`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goDeploy = await go(async () => {
    logger.debug('Fetching Airnode bucket');
    let bucketName = await cloudProviderLib[type].getAirnodeBucket();
    if (!bucketName) {
      logger.debug('No Airnode bucket found, creating');
      bucketName = await cloudProviderLib[type].createAirnodeBucket(cloudProvider as any);
    }
    logger.debug(`Using Airnode bucket '${bucketName}'`);

    logger.debug('Fetching Airnode bucket content');
    const directoryStructure = await cloudProviderLib[type].getBucketDirectoryStructure(bucketName);

    const bucketStagePath = `${airnodeAddress}/${stage}`;
    const bucketDeploymentPath = `${bucketStagePath}/${timestamp}`;

    const stageDirectory = getStageDirectory(directoryStructure, airnodeAddress, stage);
    if (stageDirectory) {
      logger.debug(`Deployment '${bucketStagePath}' already exists`);
      const latestDeployment = Object.keys(stageDirectory.children).sort().reverse()[0];
      const bucketConfigPath = `${bucketStagePath}/${latestDeployment}/config.json`;
      logger.debug(`Fetching configuration file '${bucketConfigPath}'`);
      const remoteConfig = JSON.parse(
        await cloudProviderLib[type].getFileFromBucket(bucketName, bucketConfigPath)
      ) as Config;

      const remoteNodeSettings = remoteConfig.nodeSettings;
      const remoteCloudProvider = remoteNodeSettings.cloudProvider as CloudProvider;
      if (remoteNodeSettings.nodeVersion !== nodeVersion) {
        throw new Error(
          `Can't update an Airnode deployment with airnode-deployer of a different version. Deployed version: ${remoteNodeSettings.nodeVersion}, airnode-deployer version: ${nodeVersion}`
        );
      }
      if (remoteCloudProvider.region !== region) {
        throw new Error(
          `Can't change a region of an already deployed Airnode. Current region: ${remoteCloudProvider.region}, new region: ${region}`
        );
      }

      logger.debug(`Copying Terraform state file for new deployment ${bucketDeploymentPath}`);
      const latestBucketTerraformStatePath = `${bucketStagePath}/${latestDeployment}/${TF_STATE_FILENAME}`;
      const newBucketTerraformStatePath = `${bucketDeploymentPath}/${TF_STATE_FILENAME}`;
      await cloudProviderLib[type].copyFileInBucket(
        bucketName,
        latestBucketTerraformStatePath,
        newBucketTerraformStatePath
      );
    }

    logger.debug(`Storing configuration file for new deployment ${bucketDeploymentPath}`);
    const bucketConfigPath = `${bucketDeploymentPath}/config.json`;
    await cloudProviderLib[type].storeFileToBucket(bucketName, bucketConfigPath, configPath);

    logger.debug(`Storing secrets file for new deployment ${bucketDeploymentPath}`);
    const bucketSecretsPath = `${bucketDeploymentPath}/secrets.env`;
    await cloudProviderLib[type].storeFileToBucket(bucketName, bucketSecretsPath, secretsPath);

    logger.debug('Deploying Airnode via Terraform recipes');
    const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
    const execOptions = { cwd: airnodeTmpDir };
    await terraformAirnodeApply(execOptions, config, bucketName, bucketDeploymentPath, configPath, secretsPath);
    const output = await execTerraform(execOptions, 'output', ['json', 'no-color']);
    fs.rmSync(airnodeTmpDir, { recursive: true });
    return output;
  });

  if (!goDeploy.success) {
    spinner.fail(`Failed deploying Airnode ${airnodeAddress} ${stage} to ${type} ${region}`);
    throw goDeploy.error;
  }

  spinner.succeed(`Deployed Airnode ${airnodeAddress} ${stage} to ${type} ${region}`);
  return transformTerraformOutput(goDeploy.data);
};

export async function terraformAirnodeDestroy(
  execOptions: child.ExecOptions,
  cloudProvider: CloudProvider,
  airnodeAddressShort: string,
  stage: string,
  bucket: string,
  bucketPath: string
) {
  await terraformAirnodeInit(execOptions, cloudProvider, bucket, bucketPath);

  const commonArguments = prepareAirnodeApplyDestroyArguments({
    airnodeAddressShort,
    stage,
    handlerDir,
    disableConcurrencyReservations: cloudProvider.disableConcurrencyReservations,
  });
  commonArguments.push('auto-approve');

  await execTerraform(
    execOptions,
    'destroy',
    prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, bucketPath, commonArguments)
  );
}

export type DeploymentVersion = {
  id: string;
  timestamp: string;
};

export type Deployment = {
  id: string;
  cloudProvider: CloudProvider;
  airnodeAddress: string;
  stage: string;
  airnodeVersion: string;
  lastUpdate: string;
  versions: DeploymentVersion[];
  bucketName: string;
  bucketLatestDeploymentPath: string;
};

// If deploymentId is provided it tries to fetch only that one deployment and returns early when found
async function fetchDeployments(cloudProviderType: CloudProvider['type'], deploymentId?: string) {
  const deployments: Deployment[] = [];

  const bucketName = await cloudProviderLib[cloudProviderType].getAirnodeBucket();
  if (!bucketName) {
    logger.debug(`No deployments available on ${cloudProviderType.toUpperCase()}`);
    return deployments;
  }

  const directoryStructure = await cloudProviderLib[cloudProviderType].getBucketDirectoryStructure(bucketName);
  for (const [airnodeAddress, addressDirectory] of Object.entries(directoryStructure)) {
    if (addressDirectory.type !== FileSystemType.Directory) {
      logger.warn(
        `Invalid item in bucket '${bucketName}' (${cloudProviderType.toUpperCase()}) with key '${
          addressDirectory.bucketKey
        }'. Skipping.`
      );
      continue;
    }

    for (const [stage, stageDirectory] of Object.entries(addressDirectory.children)) {
      if (stageDirectory.type !== FileSystemType.Directory) {
        logger.warn(
          `Invalid item in bucket '${bucketName}' (${cloudProviderType.toUpperCase()}) with key '${
            stageDirectory.bucketKey
          }'. Skipping.`
        );
        continue;
      }

      const latestDeployment = Object.keys(stageDirectory.children).sort().reverse()[0];
      const bucketLatestDeploymentPath = `${airnodeAddress}/${stage}/${latestDeployment}`;
      const bucketConfigPath = `${bucketLatestDeploymentPath}/config.json`;
      logger.debug(`Fetching configuration file '${bucketConfigPath}'`);
      const config = JSON.parse(
        await cloudProviderLib[cloudProviderType].getFileFromBucket(bucketName, bucketConfigPath)
      ) as Config;
      const cloudProvider = config.nodeSettings.cloudProvider as CloudProvider;
      const airnodeVersion = config.nodeSettings.nodeVersion;
      const id = hashDeployment(cloudProvider, airnodeAddress, stage, airnodeVersion);

      const deploymentVersions = Object.keys(stageDirectory.children).map((versionTimestamp) => ({
        id: hashDeploymentVersion(cloudProvider, airnodeAddress, stage, airnodeVersion, versionTimestamp),
        timestamp: versionTimestamp,
      }));
      const deployment = {
        id,
        cloudProvider,
        airnodeAddress,
        stage,
        airnodeVersion,
        lastUpdate: latestDeployment,
        versions: deploymentVersions,
        bucketName,
        bucketLatestDeploymentPath,
      };

      // We're looking for just one deployment
      if (deploymentId) {
        if (deploymentId === id) {
          // Return the deployment if found
          return [deployment];
        } else {
          // Keeping list of the deployments empty if we're looking for just one
          continue;
        }
      }

      deployments.push(deployment);
    }
  }

  return deployments;
}

export async function removeAirnode(deploymentId: string) {
  const cloudProviderType = deploymentId.slice(0, 3) as CloudProvider['type'];
  if (!availableCloudProviders.includes(cloudProviderType)) {
    throw new Error(`Invalid deployment ID '${deploymentId}'`);
  }

  const spinner = logger.getSpinner().start(`Removing Airnode '${deploymentId}'`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goRemove = await go(async () => {
    const goCloudDeploymentInfo = await go(() => fetchDeployments(cloudProviderType, deploymentId));
    if (!goCloudDeploymentInfo.success) {
      spinner.stop();
      throw new Error(
        `Failed to fetch info about '${deploymentId}' from ${cloudProviderType.toUpperCase()}: ${
          goCloudDeploymentInfo.error
        }`
      );
    }
    if (goCloudDeploymentInfo.data.length === 0) {
      spinner.stop();
      throw new Error(`No deployment with ID '${deploymentId}' found`);
    }

    const {
      cloudProvider,
      airnodeAddress,
      stage,
      airnodeVersion: deployedVersion,
      bucketName,
      bucketLatestDeploymentPath,
    } = goCloudDeploymentInfo.data[0];

    if (deployedVersion !== nodeVersion) {
      throw new Error(
        `Can't remove an Airnode deployment with airnode-deployer of a different version. Deployed version: ${deployedVersion}, airnode-deployer version: ${nodeVersion}`
      );
    }

    logger.debug('Removing Airnode via Terraform recipes');
    const airnodeAddressShort = shortenAirnodeAddress(airnodeAddress);
    const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
    const execOptions = { cwd: airnodeTmpDir };
    await terraformAirnodeDestroy(
      execOptions,
      cloudProvider,
      airnodeAddressShort,
      stage,
      bucketName,
      bucketLatestDeploymentPath
    );
    fs.rmSync(airnodeTmpDir, { recursive: true });

    // Refreshing the bucket content because the source code archives were removed by Terraform
    logger.debug('Refreshing Airnode bucket content');
    const directoryStructure = await cloudProviderLib[cloudProviderType].getBucketDirectoryStructure(bucketName);
    const addressDirectory = getAddressDirectory(directoryStructure, airnodeAddress) as Directory;
    const stageDirectory = getStageDirectory(directoryStructure, airnodeAddress, stage) as Directory;

    // Delete stage directory and its content
    logger.debug(`Deleting deployment directory '${stageDirectory.bucketKey}' and its content`);
    await cloudProviderLib[cloudProviderType].deleteBucketDirectory(bucketName, stageDirectory);
    // eslint-disable-next-line functional/immutable-data
    delete addressDirectory.children[stage];

    // Delete Airnode address directory if empty
    if (Object.keys(addressDirectory.children).length === 0) {
      logger.debug(`Deleting Airnode address directory '${addressDirectory.bucketKey}'`);
      await cloudProviderLib[cloudProviderType].deleteBucketDirectory(bucketName, addressDirectory);
      // eslint-disable-next-line functional/immutable-data
      delete directoryStructure[airnodeAddress];
    }

    // Delete the whole bucket if empty
    if (Object.keys(directoryStructure).length === 0) {
      logger.debug(`Deleting Airnode bucket '${bucketName}'`);
      await cloudProviderLib[cloudProviderType].deleteBucket(bucketName);
    }
  });

  if (!goRemove.success) {
    spinner.fail(`Failed to remove Airnode '${deploymentId}'`);
    throw goRemove.error;
  }

  spinner.succeed(`Airnode '${deploymentId}' removed successfully`);
}

export async function listAirnodes(cloudProviders: readonly CloudProvider['type'][]) {
  const deployments: Deployment[] = [];

  for (const cloudProviderType of cloudProviders) {
    // Using different line of text for each cloud provider so we can easily convey which cloud provider failed
    // and which succeeded
    const spinner = logger
      .getSpinner()
      .start(`Listing Airnode deployments from cloud provider ${cloudProviderType.toUpperCase()}`);
    if (logger.inDebugMode()) {
      spinner.info();
    }

    const goListCloudAirnodes = await go(() => fetchDeployments(cloudProviderType));

    if (goListCloudAirnodes.success) {
      spinner.succeed();
      deployments.push(...goListCloudAirnodes.data);
    } else {
      spinner.fail(`Failed to fetch deployments from ${cloudProviderType.toUpperCase()}: ${goListCloudAirnodes.error}`);
    }
  }

  deployments.sort(deploymentComparator);
  const table = new Table({
    head: ['Deployment ID', 'Cloud provider', 'Airnode address', 'Stage', 'Airnode version', 'Last update'],
    style: {
      head: ['bold'],
    },
  });

  table.push(
    ...deployments.map(({ id, cloudProvider, airnodeAddress, stage, airnodeVersion, lastUpdate }) => [
      id,
      cloudProviderReadable(cloudProvider),
      airnodeAddressReadable(airnodeAddress),
      stage,
      airnodeVersion,
      timestampReadable(lastUpdate),
    ])
  );

  consoleLog(table.toString());
}

export async function deploymentInfo(deploymentId: string) {
  const cloudProviderType = deploymentId.slice(0, 3) as CloudProvider['type'];
  if (!availableCloudProviders.includes(cloudProviderType)) {
    throw new Error(`Invalid deployment ID '${deploymentId}'`);
  }

  const spinner = logger.getSpinner().start(`Fetching info about deployment '${deploymentId}'`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goCloudDeploymentInfo = await go(() => fetchDeployments(cloudProviderType, deploymentId));

  if (!goCloudDeploymentInfo.success) {
    spinner.stop();
    throw new Error(
      `Failed to fetch info about '${deploymentId}' from ${cloudProviderType.toUpperCase()}: ${
        goCloudDeploymentInfo.error
      }`
    );
  }

  if (goCloudDeploymentInfo.data.length === 0) {
    spinner.stop();
    throw new Error(`No deployment with ID '${deploymentId}' found`);
  }

  const deployment = goCloudDeploymentInfo.data[0];
  const { id, cloudProvider, airnodeAddress, stage, airnodeVersion, lastUpdate, versions } = deployment;
  const sortedVersions = sortBy(versions, 'timestamp').reverse();
  const currentVersionId = sortedVersions.find((version) => version.timestamp === lastUpdate)!.id;
  const table = new Table({
    head: ['Version ID', 'Deployment time'],
    style: {
      head: ['bold'],
    },
  });
  table.push(...sortedVersions.map(({ id, timestamp }) => [id, timestampReadable(timestamp)]));

  spinner.succeed();
  consoleLog(`Cloud provider: ${cloudProviderReadable(cloudProvider)}`);
  consoleLog(`Airnode address: ${airnodeAddress}`);
  consoleLog(`Stage: ${stage}`);
  consoleLog(`Airnode version: ${airnodeVersion}`);
  consoleLog(`Deployment ID: ${id}`);
  const tableString = table.toString();
  const tableStringWithCurrent = tableString.replace(new RegExp(`(?<=${currentVersionId}.*?)\n`), ' (current)\n');
  consoleLog(tableStringWithCurrent);
}
