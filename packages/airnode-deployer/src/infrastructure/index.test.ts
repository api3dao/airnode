import util from 'util';
import path from 'path';
import fs from 'fs';
import pick from 'lodash/pick';
import cloneDeep from 'lodash/cloneDeep';
import { AwsCloudProvider, GcpCloudProvider, loadConfig } from '@api3/airnode-node';
import * as aws from './aws';
import * as gcp from './gcp';
import { version as nodeVersion } from '../../package.json';
import { getSpinner } from '../utils/logger';
import { parseSecretsFile } from '../utils';
import { Directory, DirectoryStructure } from '../utils/infrastructure';
import { mockBucketDirectoryStructure } from '../../test/fixtures';
import { deploymentInfo01, listAirnodes01, listAirnodes02, listAirnodes03 } from '../../test/snapshots';

const exec = jest.fn();
jest.spyOn(util, 'promisify').mockImplementation(() => exec);

import * as infrastructure from '.';

const terraformDir = path.resolve(`${__dirname}/../../terraform`);

describe('runCommand', () => {
  it('runs the command and returns the output', async () => {
    const expectedOutput = 'example command output';
    const expectedCommand = 'example command';
    exec.mockImplementation(() => ({ stdout: expectedOutput }));

    getSpinner();
    const output = await infrastructure.runCommand(expectedCommand, {});
    getSpinner().stop();

    expect(exec).toHaveBeenCalledWith(expectedCommand, {});
    expect(output).toEqual(expectedOutput);
  });

  it('throws an error if the command fails', async () => {
    const command = 'example command';
    const expectedError = new Error('example error');
    exec.mockRejectedValue(expectedError);

    getSpinner();
    await expect(infrastructure.runCommand(command, {})).rejects.toThrow(expectedError.toString());
    getSpinner().stop();
  });

  it('ignores the failed command if the ignoreError option is provided', async () => {
    const command = 'example command';
    const expectedError = new Error('example error');
    exec.mockRejectedValue(expectedError);

    getSpinner();
    await expect(infrastructure.runCommand(command, { ignoreError: true })).resolves.not.toThrow();
    getSpinner().stop();
  });
});

describe('execTerraform', () => {
  it('constructs a correct Terraform command', async () => {
    const commandOutput = 'example command output';
    exec.mockImplementation(() => ({ stdout: commandOutput }));

    const command = 'apply';
    const args = [['var', 'name', 'value'], ['switch', 'true'], 'flag'] as infrastructure.CommandArg[];
    const options = ['additional_option1', 'additional_option2'];
    const execOptions = { ignoreError: true };

    await infrastructure.execTerraform(execOptions, command, args, options);
    expect(exec).toHaveBeenCalledWith(
      `terraform apply -var="name=value" -switch=true -flag additional_option1 additional_option2`,
      execOptions
    );
  });
});

describe('awsApplyDestroyArguments', () => {
  it('returns AWS-specific arguments for apply/destroy Terraform command', () => {
    const cloudProvider = {
      type: 'aws',
      region: 'europe-central-1',
    } as AwsCloudProvider;
    const expectedVariables = [['var', 'aws_region', cloudProvider.region]];

    expect(infrastructure.awsApplyDestroyArguments(cloudProvider, '_bucket', '_path')).toEqual(expectedVariables);
  });
});

describe('gcpApplyDestroyArguments', () => {
  it('returns GCP-specific arguments for apply/destroy Terraform command', () => {
    const cloudProvider = {
      type: 'gcp',
      region: 'europe-central1',
      projectId: 'airnode-test-123',
    } as GcpCloudProvider;
    const bucket = 'airnode-123456789';
    const path = 'airnode-address/stage/timestamp';
    const expectedVariables = [
      ['var', 'gcp_region', cloudProvider.region],
      ['var', 'gcp_project', cloudProvider.projectId],
      ['var', 'airnode_bucket', bucket],
      ['var', 'deployment_bucket_dir', path],
    ];

    expect(infrastructure.gcpApplyDestroyArguments(cloudProvider, bucket, path)).toEqual(expectedVariables);
  });
});

describe('awsAirnodeInitArguments', () => {
  it('returns AWS-specific arguments for init Terraform command', () => {
    const cloudProvider = {
      type: 'aws',
      region: 'europe-central-1',
    } as AwsCloudProvider;
    const bucket = 'airnode-123456789';
    const path = 'airnode-address/stage/timestamp';
    const expectedVariables = [
      ['backend-config', 'region', cloudProvider.region],
      ['backend-config', 'bucket', bucket],
      ['backend-config', 'key', `${path}/${infrastructure.TF_STATE_FILENAME}`],
    ];

    expect(infrastructure.awsAirnodeInitArguments(cloudProvider, bucket, path)).toEqual(expectedVariables);
  });
});

describe('gcpAirnodeInitArguments', () => {
  it('returns GCP-specific arguments for init Terraform command', () => {
    const cloudProvider = {
      type: 'gcp',
      region: 'europe-central1',
      projectId: 'airnode-test-123',
    } as GcpCloudProvider;
    const bucket = 'airnode-123456789';
    const path = 'airnode-address/stage/timestamp';
    const expectedVariables = [
      ['backend-config', 'bucket', bucket],
      ['backend-config', 'prefix', path],
    ];

    expect(infrastructure.gcpAirnodeInitArguments(cloudProvider, bucket, path)).toEqual(expectedVariables);
  });
});

describe('awsAirnodeImportOptions', () => {
  it('returns AWS-specific arguments for import Terraform command', () => {
    const cloudProvider = {
      type: 'aws',
      region: 'europe-central-1',
    } as AwsCloudProvider;

    expect(infrastructure.awsAirnodeImportOptions(cloudProvider)).toEqual([]);
  });
});

describe('gcpAirnodeImportOptions', () => {
  it('returns GCP-specific arguments for import Terraform command', () => {
    const cloudProvider = {
      type: 'gcp',
      region: 'europe-central1',
      projectId: 'airnode-test-123',
    } as GcpCloudProvider;
    const expectedVariables = ['module.startCoordinator.google_app_engine_application.app[0]', cloudProvider.projectId];

    expect(infrastructure.gcpAirnodeImportOptions(cloudProvider)).toEqual(expectedVariables);
  });
});

describe('cloudProviderAirnodeApplyDestoryArguments', () => {
  it('returns correct function for apply/destroy arguments based on the cloud provider', () => {
    expect(infrastructure.cloudProviderAirnodeApplyDestoryArguments.aws).toEqual(
      infrastructure.awsApplyDestroyArguments
    );
    expect(infrastructure.cloudProviderAirnodeApplyDestoryArguments.gcp).toEqual(
      infrastructure.gcpApplyDestroyArguments
    );
  });
});

describe('cloudProviderAirnodeInitArguments', () => {
  it('returns correct function for init arguments based on the cloud provider', () => {
    expect(infrastructure.cloudProviderAirnodeInitArguments.aws).toEqual(infrastructure.awsAirnodeInitArguments);
    expect(infrastructure.cloudProviderAirnodeInitArguments.gcp).toEqual(infrastructure.gcpAirnodeInitArguments);
  });
});

describe('cloudProviderAirnodeImportOptions', () => {
  it('returns correct function for import arguments based on the cloud provider', () => {
    expect(infrastructure.cloudProviderAirnodeImportOptions.aws).toEqual(infrastructure.awsAirnodeImportOptions);
    expect(infrastructure.cloudProviderAirnodeImportOptions.gcp).toEqual(infrastructure.gcpAirnodeImportOptions);
  });
});

describe('prepareAirnodeInitArguments', () => {
  it('returns Terraform init arguments', () => {
    const cloudProvider = {
      type: 'gcp',
      region: 'europe-central1',
      projectId: 'airnode-test-123',
    } as GcpCloudProvider;
    const bucket = 'airnode-123456789';
    const path = 'airnode-address/stage/timestamp';
    const commonArgument = [['var', 'name', 'value']] as infrastructure.CommandArg[];

    const expectedArguments = [
      ['backend-config', 'bucket', bucket],
      ['backend-config', 'prefix', path],
      ['var', 'name', 'value'],
    ];
    expect(infrastructure.prepareAirnodeInitArguments(cloudProvider, bucket, path, commonArgument)).toEqual(
      expectedArguments
    );
  });
});

describe('prepareCloudProviderAirnodeApplyDestoryArguments', () => {
  it('returns Terraform apply/destroy arguments', () => {
    const cloudProvider = {
      type: 'aws',
      region: 'europe-central-1',
    } as AwsCloudProvider;
    const bucket = 'airnode-123456789';
    const path = 'airnode-address/stage/timestamp';
    const commonArgument = [['var', 'name', 'value']] as infrastructure.CommandArg[];

    const expectedArguments = [
      ['var', 'aws_region', cloudProvider.region],
      ['var', 'name', 'value'],
    ];
    expect(
      infrastructure.prepareCloudProviderAirnodeApplyDestoryArguments(cloudProvider, bucket, path, commonArgument)
    ).toEqual(expectedArguments);
  });
});

describe('prepareAirnodeApplyDestroyArguments', () => {
  const variables = {
    airnodeAddressShort: 'd0624e6',
    stage: 'dev',
    configPath: '/some/path/config.json',
    secretsPath: '/some/path/secrets.env',
    handlerDir: '/some/path/handlers',
    disableConcurrencyReservations: true,
    airnodeWalletPrivateKey: '0x650516ef51a466cc0509dc7d6bad17e17da3a3d63f7f5267386920873c752cdc',
  };

  it('returns cloud provider agnostic Terraform variables', () => {
    const expectedArguments = [
      ['var', 'airnode_address_short', variables.airnodeAddressShort],
      ['var', 'stage', variables.stage],
      ['var', 'configuration_file', variables.configPath],
      ['var', 'secrets_file', variables.secretsPath],
      ['var', 'handler_dir', variables.handlerDir],
      ['var', 'disable_concurrency_reservation', `${variables.disableConcurrencyReservations}`],
      ['var', 'airnode_wallet_private_key', variables.airnodeWalletPrivateKey],
      ['input', 'false'],
      'no-color',
    ];
    expect(infrastructure.prepareAirnodeApplyDestroyArguments(variables)).toEqual(expectedArguments);
  });

  it('sets the missing optional arguments correctly', () => {
    const onlyRequiredVariables = pick(variables, [
      'airnodeAddressShort',
      'stage',
      'handlerDir',
      'disableConcurrencyReservations',
    ]) as infrastructure.AirnodeApplyDestroyVariables;
    const expectedArguments = [
      ['var', 'airnode_address_short', onlyRequiredVariables.airnodeAddressShort],
      ['var', 'stage', onlyRequiredVariables.stage],
      ['var', 'configuration_file', 'NULL'],
      ['var', 'secrets_file', 'NULL'],
      ['var', 'handler_dir', onlyRequiredVariables.handlerDir],
      ['var', 'disable_concurrency_reservation', `${onlyRequiredVariables.disableConcurrencyReservations}`],
      ['var', 'airnode_wallet_private_key', 'NULL'],
      ['input', 'false'],
      'no-color',
    ];
    expect(infrastructure.prepareAirnodeApplyDestroyArguments(onlyRequiredVariables)).toEqual(expectedArguments);
  });
});

describe('terraformAirnodeInit', () => {
  it('calls the Terraform init command', async () => {
    const commandOutput = 'example command output';
    exec.mockImplementation(() => ({ stdout: commandOutput }));

    const execOptions = {};
    const cloudProvider = {
      type: 'aws',
      region: 'europe-central-1',
    } as AwsCloudProvider;
    const bucket = 'airnode-123456789';
    const bucketPath = 'airnode-address/stage/timestamp';

    await infrastructure.terraformAirnodeInit(execOptions, cloudProvider, bucket, bucketPath);
    expect(exec).toHaveBeenCalledWith(
      `terraform init -backend-config="region=europe-central-1" -backend-config="bucket=airnode-123456789" -backend-config="key=airnode-address/stage/timestamp/default.tfstate" -from-module=${terraformDir}/aws`,
      execOptions
    );
  });
});

describe('transformTerraformOutput', () => {
  it('returns Terraform output command output as an object', () => {
    const commandOutput =
      '{"http_gateway_url": {"value": "http://some.http.gateway.address/random_path/"}, "http_signed_data_gateway_url": {"value": "http://some.http.signed.data.gateway.address/random_path/"}}';
    const expectedObject = {
      httpGatewayUrl: 'http://some.http.gateway.address/random_path/',
      httpSignedDataGatewayUrl: 'http://some.http.signed.data.gateway.address/random_path/',
    };

    expect(infrastructure.transformTerraformOutput(commandOutput)).toEqual(expectedObject);
  });
});

describe('terraformAirnodeApply', () => {
  const commandOutput = 'example command output';
  exec.mockImplementation(() => ({ stdout: commandOutput }));
  const execOptions = {};
  const configPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'config.aws.valid.json');
  const secretsPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'secrets.valid.env');
  const handlerDir = path.resolve(`${__dirname}/../../.webpack`);
  const secrets = parseSecretsFile(secretsPath);
  const config = loadConfig(configPath, secrets);
  const bucket = 'airnode-123456789';
  const bucketPath = 'airnode-address/stage/timestamp';

  it('runs Terraform init & apply commands with correct arguments', async () => {
    await infrastructure.terraformAirnodeApply(execOptions, config, bucket, bucketPath, configPath, secretsPath);

    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=airnode-address/stage/timestamp/default.tfstate" -from-module=${terraformDir}/aws`,
      execOptions
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform apply -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -var="http_api_key=12345678-0000-0000-0000-000000000000" -var="http_max_concurrency=20" -var="http_signed_data_api_key=87654321-0000-0000-0000-000000000000" -var="http_signed_data_max_concurrency=20" -auto-approve`,
      execOptions
    );
  });

  it('runs also an import command if needed', async () => {
    const gcpConfig = {
      ...config,
      nodeSettings: {
        ...config.nodeSettings,
        cloudProvider: {
          type: 'gcp' as const,
          region: 'us-east1',
          projectId: 'airnode-test-123456',
          disableConcurrencyReservations: false,
        },
      },
    };
    await infrastructure.terraformAirnodeApply(execOptions, gcpConfig, bucket, bucketPath, configPath, secretsPath);
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="bucket=airnode-123456789" -backend-config="prefix=airnode-address/stage/timestamp" -from-module=${terraformDir}/gcp`,
      execOptions
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform import -var="gcp_region=us-east1" -var="gcp_project=airnode-test-123456" -var="airnode_bucket=airnode-123456789" -var="deployment_bucket_dir=airnode-address/stage/timestamp" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -var="http_api_key=12345678-0000-0000-0000-000000000000" -var="http_max_concurrency=20" -var="http_signed_data_api_key=87654321-0000-0000-0000-000000000000" -var="http_signed_data_max_concurrency=20" module.startCoordinator.google_app_engine_application.app[0] airnode-test-123456`,
      { ignoreError: true }
    );
    expect(exec).toHaveBeenNthCalledWith(
      3,
      `terraform apply -var="gcp_region=us-east1" -var="gcp_project=airnode-test-123456" -var="airnode_bucket=airnode-123456789" -var="deployment_bucket_dir=airnode-address/stage/timestamp" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -var="http_api_key=12345678-0000-0000-0000-000000000000" -var="http_max_concurrency=20" -var="http_signed_data_api_key=87654321-0000-0000-0000-000000000000" -var="http_signed_data_max_concurrency=20" -auto-approve`,
      execOptions
    );
  });

  it('skips arguments for HTTP gateways if not provided', async () => {
    const noGatewaysConfig = {
      ...config,
      nodeSettings: {
        ...config.nodeSettings,
        httpGateway: {
          enabled: false as const,
        },
        httpSignedDataGateway: {
          enabled: false as const,
        },
      },
    };

    await infrastructure.terraformAirnodeApply(
      execOptions,
      noGatewaysConfig,
      bucket,
      bucketPath,
      configPath,
      secretsPath
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=airnode-address/stage/timestamp/default.tfstate" -from-module=${terraformDir}/aws`,
      execOptions
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform apply -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -auto-approve`,
      execOptions
    );
  });
});

describe('deployAirnode', () => {
  const handlerDir = path.resolve(`${__dirname}/../../.webpack`);
  const configPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'config.aws.valid.json');
  const secretsPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'secrets.valid.env');
  const secrets = parseSecretsFile(secretsPath);
  const config = loadConfig(configPath, secrets);
  const bucket = 'airnode-123456789';
  const expectedOutput = {
    httpGatewayUrl: 'http://some.http.gateway.address/random_path/',
    httpSignedDataGatewayUrl: 'http://some.http.signed.data.gateway.address/random_path/',
  };
  let awsGetAirnodeBucketSpy: jest.SpyInstance;
  let awsGetBucketDirectoryStructureSpy: jest.SpyInstance;
  let awsGetFileFromBucketSpy: jest.SpyInstance;
  let awsCopyFileInBucketSpy: jest.SpyInstance;
  let awsStoreFileToBucketSpy: jest.SpyInstance;

  beforeEach(() => {
    const commandOutput =
      '{"http_gateway_url": {"value": "http://some.http.gateway.address/random_path/"}, "http_signed_data_gateway_url": {"value": "http://some.http.signed.data.gateway.address/random_path/"}}';
    exec.mockImplementation(() => ({ stdout: commandOutput }));
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(bucket);
    awsGetBucketDirectoryStructureSpy = jest.spyOn(aws, 'getBucketDirectoryStructure').mockResolvedValue({});
    awsGetFileFromBucketSpy = jest
      .spyOn(aws, 'getFileFromBucket')
      .mockResolvedValue(fs.readFileSync(configPath).toString());
    awsCopyFileInBucketSpy = jest.spyOn(aws, 'copyFileInBucket').mockResolvedValue();
    awsStoreFileToBucketSpy = jest.spyOn(aws, 'storeFileToBucket').mockResolvedValue();
    jest.spyOn(fs, 'mkdtempSync').mockImplementation(() => 'tmpDir');
    jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
    jest.spyOn(Date, 'now').mockImplementation(() => 1662730904);
  });

  it('deploys Airnode', async () => {
    const terraformOutput = await infrastructure.deployAirnode(config, configPath, secretsPath, Date.now());
    expect(terraformOutput).toEqual(expectedOutput);
    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledWith();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(awsGetFileFromBucketSpy).not.toHaveBeenCalled();
    expect(awsCopyFileInBucketSpy).not.toHaveBeenCalled();
    expect(awsStoreFileToBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/config.json',
      configPath
    );
    expect(awsStoreFileToBucketSpy).toHaveBeenNthCalledWith(
      2,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/secrets.env',
      secretsPath
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/default.tfstate" -from-module=${terraformDir}/aws`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform apply -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -var="http_api_key=12345678-0000-0000-0000-000000000000" -var="http_max_concurrency=20" -var="http_signed_data_api_key=87654321-0000-0000-0000-000000000000" -var="http_signed_data_max_concurrency=20" -auto-approve`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(3, 'terraform output -json -no-color', { cwd: 'tmpDir' });
  });

  it(`creates a bucket if it doesn't exist`, async () => {
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(null);
    const newBucket = 'airnode-987654321';
    const awsCreateAirnodeBucket = jest.spyOn(aws, 'createAirnodeBucket').mockResolvedValue(newBucket);

    const terraformOutput = await infrastructure.deployAirnode(config, configPath, secretsPath, Date.now());
    expect(terraformOutput).toEqual(expectedOutput);
    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledWith();
    expect(awsCreateAirnodeBucket).toHaveBeenCalledWith(config.nodeSettings.cloudProvider);
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(newBucket);
    expect(awsGetFileFromBucketSpy).not.toHaveBeenCalled();
    expect(awsCopyFileInBucketSpy).not.toHaveBeenCalled();
    expect(awsStoreFileToBucketSpy).toHaveBeenNthCalledWith(
      1,
      newBucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/config.json',
      configPath
    );
    expect(awsStoreFileToBucketSpy).toHaveBeenNthCalledWith(
      2,
      newBucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/secrets.env',
      secretsPath
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-987654321" -backend-config="key=0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/default.tfstate" -from-module=${terraformDir}/aws`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform apply -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -var="http_api_key=12345678-0000-0000-0000-000000000000" -var="http_max_concurrency=20" -var="http_signed_data_api_key=87654321-0000-0000-0000-000000000000" -var="http_signed_data_max_concurrency=20" -auto-approve`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(3, 'terraform output -json -no-color', { cwd: 'tmpDir' });
  });

  it(`deploys a new version of an existing deployment`, async () => {
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(mockBucketDirectoryStructure);

    const terraformOutput = await infrastructure.deployAirnode(config, configPath, secretsPath, Date.now());
    expect(terraformOutput).toEqual(expectedOutput);
    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledWith();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledWith(
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
    expect(awsCopyFileInBucketSpy).toHaveBeenCalledWith(
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/default.tfstate',
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/default.tfstate'
    );
    expect(awsStoreFileToBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/config.json',
      configPath
    );
    expect(awsStoreFileToBucketSpy).toHaveBeenNthCalledWith(
      2,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/secrets.env',
      secretsPath
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662730904/default.tfstate" -from-module=${terraformDir}/aws`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform apply -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=${configPath}" -var="secrets_file=${secretsPath}" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=0xd627c727db73ed7067cbc1e15295f7004b83c01d243aa90711d549cda6bd5bca" -input=false -no-color -var="max_concurrency=100" -var="http_api_key=12345678-0000-0000-0000-000000000000" -var="http_max_concurrency=20" -var="http_signed_data_api_key=87654321-0000-0000-0000-000000000000" -var="http_signed_data_max_concurrency=20" -auto-approve`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(3, 'terraform output -json -no-color', { cwd: 'tmpDir' });
  });

  it(`throws an error if there's a version mismatch during a deployment update`, async () => {
    const wrongVersionConfig = {
      ...config,
      nodeSettings: {
        ...config.nodeSettings,
        nodeVersion: '0.0.1',
      },
    };
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(mockBucketDirectoryStructure);
    awsGetFileFromBucketSpy = jest
      .spyOn(aws, 'getFileFromBucket')
      .mockResolvedValue(JSON.stringify(wrongVersionConfig));

    await expect(infrastructure.deployAirnode(config, configPath, secretsPath, Date.now())).rejects.toThrow(
      new Error(
        `Can't update an Airnode deployment with airnode-deployer of a different version. Deployed version: 0.0.1, airnode-deployer version: ${nodeVersion}`
      )
    );
  });

  it(`throws an error if there's a region mismatch during a deployment update`, async () => {
    const wrongRegionConfig = {
      ...config,
      nodeSettings: {
        ...config.nodeSettings,
        cloudProvider: {
          ...config.nodeSettings.cloudProvider,
          region: 'eu-central-1',
        },
      },
    };
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(mockBucketDirectoryStructure);
    awsGetFileFromBucketSpy = jest.spyOn(aws, 'getFileFromBucket').mockResolvedValue(JSON.stringify(wrongRegionConfig));

    await expect(infrastructure.deployAirnode(config, configPath, secretsPath, Date.now())).rejects.toThrow(
      new Error(
        `Can't change a region of an already deployed Airnode. Current region: eu-central-1, new region: us-east-1`
      )
    );
  });

  it(`throws an error if something in the deploy process wasn't successful`, async () => {
    const expectedError = new Error('example error');
    exec.mockRejectedValue(expectedError);

    await expect(infrastructure.deployAirnode(config, configPath, secretsPath, Date.now())).rejects.toThrow(
      expectedError.toString()
    );
  });
});

describe('terraformAirnodeDestroy', () => {
  const execOptions = {};
  const cloudProvider = {
    type: 'aws',
    region: 'europe-central-1',
  } as AwsCloudProvider;
  const handlerDir = path.resolve(`${__dirname}/../../.webpack`);
  const airnodeAddressShort = 'a30ca71';
  const stage = 'dev';
  const bucket = 'airnode-123456789';
  const bucketPath = 'airnode-address/stage/timestamp';

  it('runs Terraform init & destory commands with correct arguments', async () => {
    const commandOutput = 'example command output';
    exec.mockImplementation(() => ({ stdout: commandOutput }));

    await infrastructure.terraformAirnodeDestroy(
      execOptions,
      cloudProvider,
      airnodeAddressShort,
      stage,
      bucket,
      bucketPath
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=europe-central-1" -backend-config="bucket=airnode-123456789" -backend-config="key=airnode-address/stage/timestamp/default.tfstate" -from-module=${terraformDir}/aws`,
      execOptions
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform destroy -var="aws_region=europe-central-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=NULL" -var="secrets_file=NULL" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=NULL" -input=false -no-color -auto-approve`,
      execOptions
    );
  });
});

describe('removeAirnode', () => {
  const handlerDir = path.resolve(`${__dirname}/../../.webpack`);
  const configPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'config.aws.valid.json');
  const secretsPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'secrets.valid.env');
  const secrets = parseSecretsFile(secretsPath);
  const config = loadConfig(configPath, secrets);
  const deploymentId = 'aws40207f25';
  const bucket = 'airnode-123456789';

  let mutableDirectoryStructure: DirectoryStructure;
  let awsGetAirnodeBucketSpy: jest.SpyInstance;
  let awsGetBucketDirectoryStructureSpy: jest.SpyInstance;
  let awsGetFileFromBucketSpy: jest.SpyInstance;
  let awsDeleteBucketDirectory: jest.SpyInstance;
  let awsDeleteBucket: jest.SpyInstance;

  beforeEach(() => {
    mutableDirectoryStructure = cloneDeep(mockBucketDirectoryStructure);
    exec.mockImplementation(() => ({}));
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(bucket);
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(mutableDirectoryStructure);
    awsGetFileFromBucketSpy = jest
      .spyOn(aws, 'getFileFromBucket')
      .mockResolvedValue(fs.readFileSync(configPath).toString());
    awsDeleteBucketDirectory = jest.spyOn(aws, 'deleteBucketDirectory').mockResolvedValue();
    awsDeleteBucket = jest.spyOn(aws, 'deleteBucket').mockResolvedValue();
    jest.spyOn(fs, 'mkdtempSync').mockImplementation(() => 'tmpDir');
    jest.spyOn(fs, 'rmSync').mockImplementation(() => {});
  });

  it('removes Airnode', async () => {
    const happyPathDeploymentId = 'aws7195b548';

    await infrastructure.removeAirnode(happyPathDeploymentId);
    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledWith();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenNthCalledWith(1, bucket);
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledWith(
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json'
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/default.tfstate" -from-module=${terraformDir}/aws`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform destroy -var="aws_region=us-east-1" -var="airnode_address_short=d0624e6" -var="stage=dev" -var="configuration_file=NULL" -var="secrets_file=NULL" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=NULL" -input=false -no-color -auto-approve`,
      { cwd: 'tmpDir' }
    );
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenNthCalledWith(2, bucket);
    expect(awsDeleteBucketDirectory).toHaveBeenCalledWith(
      bucket,
      (mockBucketDirectoryStructure['0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6'] as Directory).children['dev']
    );
    expect(awsDeleteBucketDirectory).toHaveBeenCalledTimes(1);
    expect(awsDeleteBucket).not.toHaveBeenCalled();
  });

  it('deletes the address directory if there are no other deployments with that address', async () => {
    await infrastructure.removeAirnode(deploymentId);
    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledWith();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenNthCalledWith(1, bucket);
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledWith(
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/default.tfstate" -from-module=${terraformDir}/aws`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform destroy -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=NULL" -var="secrets_file=NULL" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=NULL" -input=false -no-color -auto-approve`,
      { cwd: 'tmpDir' }
    );
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenNthCalledWith(2, bucket);
    expect(awsDeleteBucketDirectory).toHaveBeenNthCalledWith(
      1,
      bucket,
      (mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory).children['dev']
    );
    expect(awsDeleteBucketDirectory).toHaveBeenNthCalledWith(2, bucket, {
      ...mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'],
      children: {},
    });
    expect(awsDeleteBucketDirectory).toHaveBeenCalledTimes(2);
    expect(awsDeleteBucket).not.toHaveBeenCalled();
  });

  it('deletes the whole bucket if there are no more deployments', async () => {
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(pick(mutableDirectoryStructure, '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'));

    await infrastructure.removeAirnode(deploymentId);
    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledWith();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenNthCalledWith(1, bucket);
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledWith(
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
    expect(exec).toHaveBeenNthCalledWith(
      1,
      `terraform init -backend-config="region=us-east-1" -backend-config="bucket=airnode-123456789" -backend-config="key=0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/default.tfstate" -from-module=${terraformDir}/aws`,
      { cwd: 'tmpDir' }
    );
    expect(exec).toHaveBeenNthCalledWith(
      2,
      `terraform destroy -var="aws_region=us-east-1" -var="airnode_address_short=a30ca71" -var="stage=dev" -var="configuration_file=NULL" -var="secrets_file=NULL" -var="handler_dir=${handlerDir}" -var="disable_concurrency_reservation=false" -var="airnode_wallet_private_key=NULL" -input=false -no-color -auto-approve`,
      { cwd: 'tmpDir' }
    );
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenNthCalledWith(2, bucket);
    expect(awsDeleteBucketDirectory).toHaveBeenNthCalledWith(
      1,
      bucket,
      (mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory).children['dev']
    );
    expect(awsDeleteBucketDirectory).toHaveBeenNthCalledWith(2, bucket, {
      ...mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'],
      children: {},
    });
    expect(awsDeleteBucketDirectory).toHaveBeenCalledTimes(2);
    expect(awsDeleteBucket).toHaveBeenCalledWith(bucket);
  });

  it(`fails if there's no Airnode bucket available`, async () => {
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(null);

    await expect(infrastructure.removeAirnode(deploymentId)).rejects.toThrow(
      new Error(`No deployment with ID '${deploymentId}' found`)
    );
  });

  it(`fails if there's no such deployment available`, async () => {
    const nonexistingDeploymentId = 'aws91f2e695';

    await expect(infrastructure.removeAirnode(nonexistingDeploymentId)).rejects.toThrow(
      new Error(`No deployment with ID '${nonexistingDeploymentId}' found`)
    );
  });

  it(`fails if invalid deployment ID is provided`, async () => {
    const invalidDeploymentId = 'indalivd_deployment_id';

    await expect(infrastructure.removeAirnode(invalidDeploymentId)).rejects.toThrow(
      new Error(`Invalid deployment ID '${invalidDeploymentId}'`)
    );
  });

  it(`fails if there's a version mismatch`, async () => {
    const wrongVersionDeploymentId = 'aws1ed1bb82';
    const wrongVersionConfig = {
      ...config,
      nodeSettings: {
        ...config.nodeSettings,
        nodeVersion: '0.0.1',
      },
    };
    awsGetFileFromBucketSpy = jest
      .spyOn(aws, 'getFileFromBucket')
      .mockResolvedValue(JSON.stringify(wrongVersionConfig));

    await expect(infrastructure.removeAirnode(wrongVersionDeploymentId)).rejects.toThrow(
      new Error(
        `Can't remove an Airnode deployment with airnode-deployer of a different version. Deployed version: 0.0.1, airnode-deployer version: ${nodeVersion}`
      )
    );
  });

  it('fails if the Terraform command fails', async () => {
    const expectedError = new Error('example error');
    exec.mockRejectedValue(expectedError);

    await expect(infrastructure.removeAirnode(deploymentId)).rejects.toThrow(expectedError.toString());
  });
});

describe('listAirnodes', () => {
  const bucket = 'airnode-123456789';
  const configAwsPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'config.aws.valid.json');
  const configGcpPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'config.gcp.valid.json');
  const directoryStructure = pick(mockBucketDirectoryStructure, [
    '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6',
    '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
  ]);

  let awsGetAirnodeBucketSpy: jest.SpyInstance;
  let awsGetBucketDirectoryStructureSpy: jest.SpyInstance;
  let awsGetFileFromBucketSpy: jest.SpyInstance;
  let gcpGetAirnodeBucketSpy: jest.SpyInstance;
  let gcpGetBucketDirectoryStructureSpy: jest.SpyInstance;
  let gcpGetFileFromBucketSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(bucket);
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(directoryStructure);
    awsGetFileFromBucketSpy = jest
      .spyOn(aws, 'getFileFromBucket')
      .mockResolvedValue(fs.readFileSync(configAwsPath).toString());
    gcpGetAirnodeBucketSpy = jest.spyOn(gcp, 'getAirnodeBucket').mockResolvedValue(bucket);
    gcpGetBucketDirectoryStructureSpy = jest
      .spyOn(gcp, 'getBucketDirectoryStructure')
      .mockResolvedValue(directoryStructure);
    gcpGetFileFromBucketSpy = jest
      .spyOn(gcp, 'getFileFromBucket')
      .mockResolvedValue(fs.readFileSync(configGcpPath).toString());
    consoleSpy = jest.spyOn(console, 'log');
  });

  it('lists Airnodes from multiple cloud providers', async () => {
    consoleSpy.mockImplementationOnce((output: string) => {
      for (const line of listAirnodes01.split('\n')) {
        expect(output).toContain(line);
      }
    });

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    const cloudProviders = ['aws', 'gcp'] as const;
    await infrastructure.listAirnodes(cloudProviders);
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledTimes(1);
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(gcpGetBucketDirectoryStructureSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledTimes(3);
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json'
    );
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      2,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/config.json'
    );
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      3,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
    expect(gcpGetFileFromBucketSpy).toHaveBeenCalledTimes(3);
    expect(gcpGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json'
    );
    expect(gcpGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      2,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/config.json'
    );
    expect(gcpGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      3,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
  });

  it('lists Airnodes only from non-failing cloud providers', async () => {
    consoleSpy.mockImplementationOnce((output: string) => {
      for (const line of listAirnodes02.split('\n')) {
        expect(output).toContain(line);
      }
    });
    const expectedError = new Error('example error');
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockRejectedValue(expectedError);

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    const cloudProviders = ['aws', 'gcp'] as const;
    await infrastructure.listAirnodes(cloudProviders);
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetBucketDirectoryStructureSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(gcpGetFileFromBucketSpy).toHaveBeenCalledTimes(3);
    expect(gcpGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json'
    );
    expect(gcpGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      2,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/config.json'
    );
    expect(gcpGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      3,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
  });

  it(`shows no Airnodes if there's no Airnode bucket`, async () => {
    consoleSpy.mockImplementationOnce((output: string) => {
      expect(output).toEqual(listAirnodes03);
    });
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(null);

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    const cloudProviders = ['aws'] as const;
    await infrastructure.listAirnodes(cloudProviders);
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetAirnodeBucketSpy).not.toHaveBeenCalled();
    expect(awsGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(gcpGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(awsGetFileFromBucketSpy).not.toHaveBeenCalled();
    expect(gcpGetFileFromBucketSpy).not.toHaveBeenCalled();
  });
});

describe('deploymentInfo', () => {
  const bucket = 'airnode-123456789';
  const configPath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'config.aws.valid.json');
  const directoryStructure = pick(mockBucketDirectoryStructure, [
    '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6',
    '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
  ]);

  let awsGetAirnodeBucketSpy: jest.SpyInstance;
  let awsGetBucketDirectoryStructureSpy: jest.SpyInstance;
  let awsGetFileFromBucketSpy: jest.SpyInstance;
  let gcpGetAirnodeBucketSpy: jest.SpyInstance;
  let gcpGetBucketDirectoryStructureSpy: jest.SpyInstance;
  let gcpGetFileFromBucketSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockResolvedValue(bucket);
    awsGetBucketDirectoryStructureSpy = jest
      .spyOn(aws, 'getBucketDirectoryStructure')
      .mockResolvedValue(directoryStructure);
    awsGetFileFromBucketSpy = jest
      .spyOn(aws, 'getFileFromBucket')
      .mockResolvedValue(fs.readFileSync(configPath).toString());
    gcpGetAirnodeBucketSpy = jest.spyOn(gcp, 'getAirnodeBucket').mockResolvedValue(bucket);
    gcpGetBucketDirectoryStructureSpy = jest
      .spyOn(gcp, 'getBucketDirectoryStructure')
      .mockResolvedValue(directoryStructure);
    gcpGetFileFromBucketSpy = jest
      .spyOn(gcp, 'getFileFromBucket')
      .mockResolvedValue(fs.readFileSync(configPath).toString());
    consoleSpy = jest.spyOn(console, 'log');
  });

  it('shows info about the deployment', async () => {
    consoleSpy.mockImplementationOnce(() => {});
    consoleSpy.mockImplementationOnce(() => {});
    consoleSpy.mockImplementationOnce(() => {});
    consoleSpy.mockImplementationOnce(() => {});
    consoleSpy.mockImplementationOnce(() => {});
    consoleSpy.mockImplementationOnce((output: string) => {
      for (const line of deploymentInfo01.split('\n')) {
        expect(output).toContain(line);
        if (line.includes('3580a278')) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(output).toContain('(current)');
        }
      }
    });

    const deploymentId = 'aws7195b548';

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    await infrastructure.deploymentInfo(deploymentId);
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetAirnodeBucketSpy).not.toHaveBeenCalled();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledTimes(1);
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(gcpGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledTimes(1);
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json'
    );
    expect(gcpGetFileFromBucketSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Cloud provider: AWS (us-east-1)');
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Airnode address: 0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6');
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'Stage: dev');
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'Airnode version: 0.8.0');
    expect(consoleSpy).toHaveBeenNthCalledWith(5, 'Deployment ID: aws7195b548');
  });

  it(`fails if there's a problem with the cloud provider`, async () => {
    const expectedError = new Error('example error');
    awsGetAirnodeBucketSpy = jest.spyOn(aws, 'getAirnodeBucket').mockRejectedValue(expectedError);

    const deploymentId = 'aws7195b548';

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    await expect(infrastructure.deploymentInfo(deploymentId)).rejects.toThrow(
      new Error(`Failed to fetch info about '${deploymentId}' from AWS: Error: ${expectedError.message}`)
    );
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetAirnodeBucketSpy).not.toHaveBeenCalled();
    expect(awsGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(gcpGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(awsGetFileFromBucketSpy).not.toHaveBeenCalled();
    expect(gcpGetFileFromBucketSpy).not.toHaveBeenCalled();
  });

  it(`fails if the deployment can't be found`, async () => {
    const nonexistingDeploymentId = 'aws2c6ef2b3';

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    await expect(infrastructure.deploymentInfo(nonexistingDeploymentId)).rejects.toThrow(
      new Error(`No deployment with ID '${nonexistingDeploymentId}' found`)
    );
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).toHaveBeenCalledTimes(1);
    expect(gcpGetAirnodeBucketSpy).not.toHaveBeenCalled();
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledTimes(1);
    expect(awsGetBucketDirectoryStructureSpy).toHaveBeenCalledWith(bucket);
    expect(gcpGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(awsGetFileFromBucketSpy).toHaveBeenCalledTimes(3);
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      1,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json'
    );
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      2,
      bucket,
      '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/config.json'
    );
    expect(awsGetFileFromBucketSpy).toHaveBeenNthCalledWith(
      3,
      bucket,
      '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json'
    );
    expect(gcpGetFileFromBucketSpy).not.toHaveBeenCalled();
  });

  it('fails if called with an invalid deployment ID', async () => {
    const invalidDeploymentId = 'xxx2c6ef2b3';

    const originalColorVariable = process.env.FORCE_COLOR;
    // I have to disable table coloring so I can compare the output
    process.env.FORCE_COLOR = '0';
    await expect(infrastructure.deploymentInfo(invalidDeploymentId)).rejects.toThrow(
      new Error(`Invalid deployment ID '${invalidDeploymentId}'`)
    );
    process.env.FORCE_COLOR = originalColorVariable;

    expect(awsGetAirnodeBucketSpy).not.toHaveBeenCalled();
    expect(gcpGetAirnodeBucketSpy).not.toHaveBeenCalled();
    expect(awsGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(gcpGetBucketDirectoryStructureSpy).not.toHaveBeenCalled();
    expect(awsGetFileFromBucketSpy).not.toHaveBeenCalled();
    expect(gcpGetFileFromBucketSpy).not.toHaveBeenCalled();
  });
});
