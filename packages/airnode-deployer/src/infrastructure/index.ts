import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import * as child from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import AdmZip from 'adm-zip';
import {
  AwsCloudProvider,
  CloudProvider,
  GcpCloudProvider,
  Config,
  evm,
  availableCloudProviders,
  deriveDeploymentId,
  deriveDeploymentVersionId,
} from '@api3/airnode-node';
import { go, goSync } from '@api3/promise-utils';
import { unsafeParseConfigWithSecrets } from '@api3/airnode-validator';
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
  Bucket,
  getMissingBucketFiles,
} from '../utils/infrastructure';
import { version as nodeVersion } from '../../package.json';
import { deriveAirnodeAddress } from '../utils';
import { airnodeAddressReadable, cloudProviderReadable, timestampReadable } from '../utils/cli';

export const TF_STATE_FILENAME = 'default.tfstate';

type TerraformAirnodeOutput = {
  http_gateway_url?: {
    value: string;
  };
  http_signed_data_gateway_url?: {
    value: string;
  };
  oev_gateway_url?: {
    value: string;
  };
};

export type DeployAirnodeOutput = {
  httpGatewayUrl?: string;
  httpSignedDataGatewayUrl?: string;
  oevGatewayUrl?: string;
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

export async function execTerraform(
  execOptions: CommandOptions,
  command: string,
  args: CommandArg[],
  options?: string[]
) {
  const formattedArgs = formatTerraformArguments(args);
  const fullCommand = compact(['terraform', command, formattedArgs.join(' '), options?.join(' ')]).join(' ');

  const goRunCommand = await go(() => runCommand(fullCommand, execOptions));
  if (!goRunCommand.success) {
    throw new Error('Terraform error occurred. See deployer log files for more details.');
  }

  return goRunCommand.data;
}

export function awsApplyDestroyArguments(
  cloudProvider: AwsCloudProvider,
  _bucket: Bucket,
  _bucketDeploymentPath: string
): CommandArg[] {
  return [['var', 'aws_region', cloudProvider.region]];
}

export function gcpApplyDestroyArguments(
  cloudProvider: GcpCloudProvider,
  bucket: Bucket,
  bucketDeploymentPath: string
): CommandArg[] {
  return [
    ['var', 'gcp_region', cloudProvider.region],
    ['var', 'gcp_project', cloudProvider.projectId],
    ['var', 'airnode_bucket', bucket.name],
    ['var', 'deployment_bucket_dir', bucketDeploymentPath],
  ];
}

export function awsAirnodeInitArguments(bucket: Bucket, bucketDeploymentPath: string): CommandArg[] {
  return [
    ['backend-config', 'region', bucket.region],
    ['backend-config', 'bucket', bucket.name],
    // This is the filename used by GCP and can't be configured there. Using it here as well to keep it consistent.
    ['backend-config', 'key', `${bucketDeploymentPath}/${TF_STATE_FILENAME}`],
  ];
}

export function gcpAirnodeInitArguments(bucket: Bucket, bucketDeploymentPath: string): CommandArg[] {
  return [
    ['backend-config', 'bucket', bucket.name],
    ['backend-config', 'prefix', bucketDeploymentPath],
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
  bucket: Bucket,
  bucketDeploymentPath: string,
  commonArguments: CommandArg[]
) {
  return [...cloudProviderAirnodeInitArguments[cloudProvider.type](bucket, bucketDeploymentPath), ...commonArguments];
}

export function prepareCloudProviderAirnodeApplyDestoryArguments(
  cloudProvider: CloudProvider,
  bucket: Bucket,
  bucketDeploymentPath: string,
  commonArguments: CommandArg[]
) {
  return [
    ...cloudProviderAirnodeApplyDestoryArguments[cloudProvider.type](
      cloudProvider as any,
      bucket,
      bucketDeploymentPath
    ),
    ...commonArguments,
  ];
}

export type AirnodeApplyDestroyVariables = {
  deploymentId: string;
  configPath?: string;
  secretsPath?: string;
  handlerDir: string;
  disableConcurrencyReservations: boolean;
  airnodeWalletPrivateKey?: string;
};

export function prepareAirnodeApplyDestroyArguments(variables: AirnodeApplyDestroyVariables): CommandArg[] {
  const { deploymentId, configPath, secretsPath, handlerDir, disableConcurrencyReservations, airnodeWalletPrivateKey } =
    variables;

  return [
    ['var', 'deployment_id', deploymentId],
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
  bucket: Bucket,
  bucketDeploymentPath: string
) {
  const terraformCloudProviderDirectory = path.join(terraformDir, cloudProvider.type);

  const commonArguments: CommandArg[] = [['from-module', terraformCloudProviderDirectory]];
  await execTerraform(
    execOptions,
    'init',
    prepareAirnodeInitArguments(cloudProvider, bucket, bucketDeploymentPath, commonArguments)
  );
}

export async function terraformAirnodeApply(
  execOptions: child.ExecOptions,
  config: Config,
  bucket: Bucket,
  bucketDeploymentPath: string,
  configPath: string,
  secretsPath: string
) {
  const {
    airnodeWalletMnemonic,
    stage,
    httpGateway,
    httpSignedDataGateway,
    oevGateway,
    nodeVersion: configNodeVersion,
  } = config.nodeSettings;
  const cloudProvider = config.nodeSettings.cloudProvider as CloudProvider;
  const airnodeAddress = deriveAirnodeAddress(airnodeWalletMnemonic);
  const airnodeWalletPrivateKey = evm.getAirnodeWallet(config).privateKey;
  logger.setSecret(airnodeWalletPrivateKey);
  const maxConcurrency = config.chains.reduce((concurrency: number, chain) => concurrency + chain.maxConcurrency, 0);

  await terraformAirnodeInit(execOptions, cloudProvider, bucket, bucketDeploymentPath);

  const commonArguments = prepareAirnodeApplyDestroyArguments({
    deploymentId: deriveDeploymentId(cloudProvider, airnodeAddress, stage, configNodeVersion),
    configPath,
    secretsPath,
    handlerDir,
    disableConcurrencyReservations: cloudProvider.disableConcurrencyReservations,
    airnodeWalletPrivateKey,
  });
  commonArguments.push(['var', 'max_concurrency', `${maxConcurrency}`]);

  if (httpGateway.enabled) {
    commonArguments.push(['var', 'http_gateway_enabled', 'true']);
    if (httpGateway.maxConcurrency) {
      commonArguments.push(['var', 'http_max_concurrency', `${httpGateway.maxConcurrency}`]);
    }
  }

  if (httpSignedDataGateway.enabled) {
    commonArguments.push(['var', 'http_signed_data_gateway_enabled', 'true']);
    if (httpSignedDataGateway.maxConcurrency) {
      commonArguments.push(['var', 'http_signed_data_max_concurrency', `${httpSignedDataGateway.maxConcurrency}`]);
    }
  }

  if (oevGateway.enabled) {
    commonArguments.push(['var', 'oev_gateway_enabled', 'true']);
    if (oevGateway.maxConcurrency) {
      commonArguments.push(['var', 'oev_max_concurrency', `${oevGateway.maxConcurrency}`]);
    }
  }

  const importOptions = cloudProviderAirnodeImportOptions[cloudProvider.type](cloudProvider as any);
  if (!isEmpty(importOptions)) {
    await execTerraform(
      { ...execOptions, ignoreError: true },
      'import',
      prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, bucketDeploymentPath, commonArguments),
      cloudProviderAirnodeImportOptions[cloudProvider.type](cloudProvider as any)
    );
  }

  commonArguments.push('auto-approve');

  await execTerraform(
    execOptions,
    'apply',
    prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, bucketDeploymentPath, commonArguments)
  );
}

export function transformTerraformOutput(terraformOutput: string): DeployAirnodeOutput {
  const parsedOutput = JSON.parse(terraformOutput) as TerraformAirnodeOutput;
  return omitBy(
    {
      httpGatewayUrl: parsedOutput.http_gateway_url?.value,
      httpSignedDataGatewayUrl: parsedOutput.http_signed_data_gateway_url?.value,
      oevGatewayUrl: parsedOutput.oev_gateway_url?.value,
    },
    isNil
  );
}

export const deployAirnode = async (config: Config, configPath: string, secretsPath: string, timestamp: number) => {
  const { airnodeWalletMnemonic, cloudProvider, stage } = config.nodeSettings;
  const airnodeAddress = deriveAirnodeAddress(airnodeWalletMnemonic);
  const { type, region } = cloudProvider as CloudProvider;

  const spinner = logger.getSpinner();
  spinner.start(`Deploying Airnode ${airnodeAddress} ${stage} to ${type} ${region}`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goDeploy = await go(async () => {
    logger.debug('Fetching Airnode bucket');
    let bucket = await cloudProviderLib[type].getAirnodeBucket();
    if (!bucket) {
      logger.debug('No Airnode bucket found, creating');
      bucket = await cloudProviderLib[type].createAirnodeBucket(cloudProvider as any);
    }
    logger.debug(`Using Airnode bucket '${bucket.name}'`);

    logger.debug('Fetching Airnode bucket content');
    const directoryStructure = await cloudProviderLib[type].getBucketDirectoryStructure(bucket);

    const bucketStagePath = `${airnodeAddress}/${stage}`;
    const bucketDeploymentPath = `${bucketStagePath}/${timestamp}`;

    const stageDirectory = getStageDirectory(directoryStructure, airnodeAddress, stage);
    if (stageDirectory) {
      logger.debug(`Deployment '${bucketStagePath}' already exists`);

      const bucketMissingFiles = getMissingBucketFiles(directoryStructure);
      if (
        bucketMissingFiles[airnodeAddress] &&
        bucketMissingFiles[airnodeAddress][stage] &&
        bucketMissingFiles[airnodeAddress][stage].length !== 0
      ) {
        throw new Error(
          `Can't update an Airnode with missing files: ${bucketMissingFiles[airnodeAddress][stage].join(
            ', '
          )}. Deployer commands may fail and manual removal may be necessary.`
        );
      }

      const latestDeployment = Object.keys(stageDirectory.children).sort().reverse()[0];
      const bucketConfigPath = `${bucketStagePath}/${latestDeployment}/config.json`;
      logger.debug(`Fetching configuration file '${bucketConfigPath}'`);
      const goGetRemoteConfigFileFromBucket = await go(() =>
        cloudProviderLib[type].getFileFromBucket(bucket!, bucketConfigPath)
      );
      if (!goGetRemoteConfigFileFromBucket.success) {
        throw new Error(`Failed to fetch configuration file. Error: ${goGetRemoteConfigFileFromBucket.error.message}`);
      }
      const goRemoteConfig = goSync(() => JSON.parse(goGetRemoteConfigFileFromBucket.data));
      if (!goRemoteConfig.success) {
        throw new Error(`Failed to parse configuration file. Error: ${goRemoteConfig.error.message}`);
      }

      const remoteNodeSettings = goRemoteConfig.data.nodeSettings;
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
        bucket,
        latestBucketTerraformStatePath,
        newBucketTerraformStatePath
      );
    }

    logger.debug(`Storing configuration file for new deployment ${bucketDeploymentPath}`);
    const bucketConfigPath = `${bucketDeploymentPath}/config.json`;
    await cloudProviderLib[type].storeFileToBucket(bucket, bucketConfigPath, configPath);

    logger.debug(`Storing secrets file for new deployment ${bucketDeploymentPath}`);
    const bucketSecretsPath = `${bucketDeploymentPath}/secrets.env`;
    await cloudProviderLib[type].storeFileToBucket(bucket, bucketSecretsPath, secretsPath);

    logger.debug('Deploying Airnode via Terraform recipes');
    const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
    const execOptions = { cwd: airnodeTmpDir };
    await terraformAirnodeApply(execOptions, config, bucket, bucketDeploymentPath, configPath, secretsPath);
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
  deploymentId: string,
  bucket: Bucket,
  bucketDeploymentPath: string
) {
  await terraformAirnodeInit(execOptions, cloudProvider, bucket, bucketDeploymentPath);

  const commonArguments = prepareAirnodeApplyDestroyArguments({
    deploymentId,
    handlerDir,
    disableConcurrencyReservations: cloudProvider.disableConcurrencyReservations,
  });
  commonArguments.push('auto-approve');

  await execTerraform(
    execOptions,
    'destroy',
    prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, bucketDeploymentPath, commonArguments)
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
  bucket: Bucket;
  bucketLatestDeploymentPath: string;
};

// If deploymentId is provided it tries to fetch only that one deployment and returns early when found
async function fetchDeployments(cloudProviderType: CloudProvider['type'], deploymentId?: string) {
  const deployments: Deployment[] = [];

  const bucket = await cloudProviderLib[cloudProviderType].getAirnodeBucket();
  if (!bucket) {
    logger.debug(`No deployments available on ${cloudProviderType.toUpperCase()}`);
    return deployments;
  }

  const directoryStructure = await cloudProviderLib[cloudProviderType].getBucketDirectoryStructure(bucket);
  const bucketMissingFiles = getMissingBucketFiles(directoryStructure);

  for (const [airnodeAddress, addressDirectory] of Object.entries(directoryStructure)) {
    if (addressDirectory.type !== FileSystemType.Directory) {
      logger.warn(
        `Invalid item in bucket '${bucket.name}' (${cloudProviderType.toUpperCase()}) with key '${
          addressDirectory.bucketKey
        }'. Skipping.`
      );
      continue;
    }

    for (const [stage, stageDirectory] of Object.entries(addressDirectory.children)) {
      if (stageDirectory.type !== FileSystemType.Directory) {
        logger.warn(
          `Invalid item in bucket '${bucket.name}' (${cloudProviderType.toUpperCase()}) with key '${
            stageDirectory.bucketKey
          }'. Skipping.`
        );
        continue;
      }

      const latestDeployment = Object.keys(stageDirectory.children).sort().reverse()[0];

      if (
        bucketMissingFiles[airnodeAddress] &&
        bucketMissingFiles[airnodeAddress][stage] &&
        bucketMissingFiles[airnodeAddress][stage].length !== 0
      ) {
        continue;
      }

      const bucketLatestDeploymentPath = `${airnodeAddress}/${stage}/${latestDeployment}`;

      const bucketConfigPath = `${bucketLatestDeploymentPath}/config.json`;
      logger.debug(`Fetching configuration file '${bucketConfigPath}'`);
      const goGetConfigFileFromBucket = await go(() =>
        cloudProviderLib[cloudProviderType].getFileFromBucket(bucket, bucketConfigPath)
      );
      if (!goGetConfigFileFromBucket.success) {
        logger.warn(`Failed to fetch configuration file. Error: ${goGetConfigFileFromBucket.error.message} Skipping.`);
        continue;
      }
      const goConfig = goSync(() => JSON.parse(goGetConfigFileFromBucket.data));
      if (!goConfig.success) {
        logger.warn(`Failed to parse configuration file. Error: ${goConfig.error.message} Skipping.`);
        continue;
      }

      logger.debug(`Fetching secrets file '${bucketConfigPath}'`);
      const bucketSecretsPath = `${bucketLatestDeploymentPath}/secrets.env`;
      const goGetSecretsFileFromBucket = await go(() =>
        cloudProviderLib[cloudProviderType].getFileFromBucket(bucket, bucketSecretsPath)
      );
      if (!goGetSecretsFileFromBucket.success) {
        logger.warn(`Failed to fetch secrets file. Error: ${goGetSecretsFileFromBucket.error.message} Skipping.`);
        continue;
      }
      const secrets = dotenv.parse(goGetSecretsFileFromBucket.data);
      const interpolatedConfig = unsafeParseConfigWithSecrets(goConfig.data, secrets);

      const cloudProvider = interpolatedConfig.nodeSettings.cloudProvider as CloudProvider;
      const airnodeVersion = interpolatedConfig.nodeSettings.nodeVersion;
      const id = deriveDeploymentId(cloudProvider, airnodeAddress, stage, airnodeVersion);

      const deploymentVersions = Object.keys(stageDirectory.children).map((versionTimestamp) => ({
        id: deriveDeploymentVersionId(cloudProvider, airnodeAddress, stage, airnodeVersion, versionTimestamp),
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
        bucket,
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

async function fetchDeployment(cloudProviderType: CloudProvider['type'], deploymentId: string, versionId?: string) {
  // We need to call `fetchDeployments` even if we want just one deployment due to the way the deployment ID is build
  // For that reason we keep the `deploymentId` paramater in `fetchDeployments` that allows to return early if the deployment is found
  const goDeployemnts = await go(() => fetchDeployments(cloudProviderType, deploymentId));

  if (!goDeployemnts.success) {
    throw new Error(
      `Failed to fetch info about '${deploymentId}' from ${cloudProviderType.toUpperCase()}: ${goDeployemnts.error}`
    );
  }

  if (goDeployemnts.data.length === 0) {
    throw new Error(`No deployment with ID '${deploymentId}' found`);
  }

  const deployment = goDeployemnts.data[0];
  let requestedVersion: DeploymentVersion | undefined;

  if (versionId) {
    requestedVersion = deployment.versions.find((version) => version.id === versionId);
    if (!requestedVersion) {
      throw new Error(`No deployment with ID '${deploymentId}' and version '${versionId}' found`);
    }
  }

  const version = requestedVersion ?? sortBy(deployment.versions, 'timestamp').reverse()[0];
  return { deployment, version };
}

async function downloadDeploymentFiles(
  cloudProviderType: CloudProvider['type'],
  deployment: Deployment,
  version: DeploymentVersion
) {
  const { airnodeAddress, stage, bucket } = deployment;

  const deploymentPathPrefix = `${airnodeAddress}/${stage}/${version.timestamp}`;
  const configFileBucketPath = `${deploymentPathPrefix}/config.json`;
  const secretsFileBucketPath = `${deploymentPathPrefix}/secrets.env`;

  const configContent = await cloudProviderLib[cloudProviderType].getFileFromBucket(bucket, configFileBucketPath);
  const secretsContent = await cloudProviderLib[cloudProviderType].getFileFromBucket(bucket, secretsFileBucketPath);

  return { configContent, secretsContent };
}

export async function removeAirnode(deploymentId: string) {
  const cloudProviderType = deploymentId.slice(0, 3) as CloudProvider['type'];
  if (!availableCloudProviders.includes(cloudProviderType)) {
    throw new Error(`Invalid deployment ID '${deploymentId}'`);
  }

  const spinner = logger.getSpinner();
  spinner.start(`Removing Airnode '${deploymentId}'`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goRemove = await go(async () => {
    const goFetchDeployment = await go(() => fetchDeployment(cloudProviderType, deploymentId));
    if (!goFetchDeployment.success) {
      spinner.stop();
      throw goFetchDeployment.error;
    }
    const { deployment } = goFetchDeployment.data;

    const {
      cloudProvider,
      airnodeAddress,
      stage,
      airnodeVersion: deployedVersion,
      bucket,
      bucketLatestDeploymentPath,
    } = deployment;

    if (deployedVersion !== nodeVersion) {
      throw new Error(
        `Can't remove an Airnode deployment with airnode-deployer of a different version. Deployed version: ${deployedVersion}, airnode-deployer version: ${nodeVersion}`
      );
    }

    logger.debug('Removing Airnode via Terraform recipes');
    const airnodeTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airnode'));
    const execOptions = { cwd: airnodeTmpDir };
    await terraformAirnodeDestroy(execOptions, cloudProvider, deploymentId, bucket, bucketLatestDeploymentPath);
    fs.rmSync(airnodeTmpDir, { recursive: true });

    // Refreshing the bucket content because the source code archives were removed by Terraform
    logger.debug('Refreshing Airnode bucket content');
    const directoryStructure = await cloudProviderLib[cloudProviderType].getBucketDirectoryStructure(bucket);
    const addressDirectory = getAddressDirectory(directoryStructure, airnodeAddress) as Directory;
    const stageDirectory = getStageDirectory(directoryStructure, airnodeAddress, stage) as Directory;

    // Delete stage directory and its content
    logger.debug(`Deleting deployment directory '${stageDirectory.bucketKey}' and its content`);
    await cloudProviderLib[cloudProviderType].deleteBucketDirectory(bucket, stageDirectory);
    // eslint-disable-next-line functional/immutable-data
    delete addressDirectory.children[stage];

    // Delete Airnode address directory if empty
    if (Object.keys(addressDirectory.children).length === 0) {
      logger.debug(`Deleting Airnode address directory '${addressDirectory.bucketKey}'`);
      await cloudProviderLib[cloudProviderType].deleteBucketDirectory(bucket, addressDirectory);
      // eslint-disable-next-line functional/immutable-data
      delete directoryStructure[airnodeAddress];
    }

    // Delete the whole bucket if empty
    if (Object.keys(directoryStructure).length === 0) {
      logger.debug(`Deleting Airnode bucket '${bucket.name}'`);
      await cloudProviderLib[cloudProviderType].deleteBucket(bucket);
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
    const spinner = logger.getSpinner();
    spinner.start(`Listing Airnode deployments from cloud provider ${cloudProviderType.toUpperCase()}`);
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

  logger.consoleLog(table.toString());
}

export async function deploymentInfo(deploymentId: string) {
  const cloudProviderType = deploymentId.slice(0, 3) as CloudProvider['type'];
  if (!availableCloudProviders.includes(cloudProviderType)) {
    throw new Error(`Invalid deployment ID '${deploymentId}'`);
  }

  const spinner = logger.getSpinner();
  spinner.start(`Fetching info about deployment '${deploymentId}'`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goFetchDeployment = await go(() => fetchDeployment(cloudProviderType, deploymentId));
  if (!goFetchDeployment.success) {
    spinner.stop();
    throw goFetchDeployment.error;
  }
  const { deployment } = goFetchDeployment.data;

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
  logger.consoleLog(`Cloud provider: ${cloudProviderReadable(cloudProvider)}`);
  logger.consoleLog(`Airnode address: ${airnodeAddress}`);
  logger.consoleLog(`Stage: ${stage}`);
  logger.consoleLog(`Airnode version: ${airnodeVersion}`);
  logger.consoleLog(`Deployment ID: ${id}`);
  const tableString = table.toString();
  const tableStringWithCurrent = tableString.replace(new RegExp(`(?<=${currentVersionId}.*?)\n`), ' (current)\n');
  logger.consoleLog(tableStringWithCurrent);
}

export async function fetchFiles(deploymentId: string, outputDir: string, versionId?: string) {
  const cloudProviderType = deploymentId.slice(0, 3) as CloudProvider['type'];
  if (!availableCloudProviders.includes(cloudProviderType)) {
    throw new Error(`Invalid deployment ID '${deploymentId}'`);
  }

  const spinner = logger.getSpinner();

  spinner.start(`Fetching files for deployment '${deploymentId}'${versionId ? ` and version '${versionId}'` : ''}'`);
  if (logger.inDebugMode()) {
    spinner.info();
  }

  const goFetchDeployment = await go(() => fetchDeployment(cloudProviderType, deploymentId, versionId));
  if (!goFetchDeployment.success) {
    spinner.stop();
    throw goFetchDeployment.error;
  }
  const { deployment, version } = goFetchDeployment.data;

  const goDownloadDeploymentFiles = await go(() => downloadDeploymentFiles(cloudProviderType, deployment, version));
  if (!goDownloadDeploymentFiles.success) {
    spinner.stop();
    throw goDownloadDeploymentFiles.error;
  }
  const { configContent, secretsContent } = goDownloadDeploymentFiles.data;

  const goOutputWritable = goSync(() => fs.accessSync(outputDir, fs.constants.W_OK));
  if (!goOutputWritable.success) {
    spinner.stop();
    throw new Error(`Can't write into an output directory '${outputDir}': ${goOutputWritable.error}`);
  }

  const zip = new AdmZip();
  zip.addFile('config.json', Buffer.from(configContent, 'utf8'));
  zip.addFile('secrets.env', Buffer.from(secretsContent, 'utf8'));
  const outputFile = path.join(outputDir, `${deploymentId}-${version.id}.zip`);
  const goWriteZip = await go(() => zip.writeZipPromise(outputFile));
  if (!goWriteZip.success) {
    spinner.stop();
    throw new Error(`Can't create a zip file '${outputFile}': ${goWriteZip.error}`);
  }

  spinner.succeed(`Files successfully downloaded as '${outputFile}'`);
}

export async function saveDeploymentFiles(
  deploymentId: string,
  versionId: string,
  configPath: string,
  secretsPath: string
) {
  const cloudProviderType = deploymentId.slice(0, 3) as CloudProvider['type'];
  if (!availableCloudProviders.includes(cloudProviderType)) {
    throw new Error(`Invalid deployment ID '${deploymentId}'`);
  }

  const spinner = logger.getSpinner();

  const goFetchDeployment = await go(() => fetchDeployment(cloudProviderType, deploymentId, versionId));
  if (!goFetchDeployment.success) {
    spinner.stop();
    throw goFetchDeployment.error;
  }
  const { deployment, version } = goFetchDeployment.data;
  const sortedVersions = sortBy(deployment.versions, 'timestamp').reverse();
  const currentVersionId = sortedVersions.find((version) => version.timestamp === deployment.lastUpdate)!.id;

  if (deployment.id === deploymentId && currentVersionId === versionId) {
    spinner.stop();
    throw new Error(
      `Already on version '${versionId}' of deployment '${deploymentId}', can't rollback to the current version`
    );
  }

  const goDownloadDeploymentFiles = await go(() => downloadDeploymentFiles(cloudProviderType, deployment, version));
  if (!goDownloadDeploymentFiles.success) {
    spinner.stop();
    throw goDownloadDeploymentFiles.error;
  }
  const { configContent, secretsContent } = goDownloadDeploymentFiles.data;

  fs.writeFileSync(configPath, configContent);
  fs.writeFileSync(secretsPath, secretsContent);
}
