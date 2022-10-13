import * as fs from 'fs';
import AWS from 'aws-sdk';
import concat from 'lodash/concat';
import compact from 'lodash/compact';
import isNil from 'lodash/isNil';
import { AwsCloudProvider } from '@api3/airnode-node';
import { go } from '@api3/promise-utils';
import * as logger from '../utils/logger';
import {
  BUCKET_NAME_REGEX,
  Directory,
  FileSystemType,
  generateBucketName,
  translatePathsToDirectoryStructure,
} from '../utils/infrastructure';

const initializeS3Service = () => {
  return new AWS.S3();
};

export const getAirnodeBucket = async () => {
  const s3 = initializeS3Service();

  logger.debug('Listing S3 buckets');
  const goBuckets = await go(() => s3.listBuckets().promise());
  if (!goBuckets.success) {
    throw new Error(`Failed to list S3 buckets: ${goBuckets.error}`);
  }

  const airnodeBuckets = goBuckets.data.Buckets?.filter((bucket) => bucket.Name?.match(BUCKET_NAME_REGEX));
  if (airnodeBuckets && airnodeBuckets.length > 1) {
    throw new Error(`Multiple Airnode buckets found, stopping. Buckets: ${JSON.stringify(airnodeBuckets)}`);
  }

  const bucketName = airnodeBuckets?.[0]?.Name;
  if (!bucketName) {
    logger.debug('No Airnode S3 bucket found');
    return null;
  }

  const goBucketLocation = await go(() => s3.getBucketLocation({ Bucket: bucketName }).promise());
  if (!goBucketLocation.success) {
    throw new Error(`Failed to get location for bucket '${bucketName}': ${goBucketLocation.error}`);
  }

  let region = goBucketLocation.data.LocationConstraint;
  // The `EU` option is listed as a possible one in the documentation
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getBucketLocation-property
  if (isNil(region) || region === 'EU') {
    throw new Error(`Unknown bucket region '${region}'`);
  }
  // The documentation says that for buckets in the `us-east-1` region the value of `LocationConstraint` is null but it is actually an empty string...
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getBucketLocation-property
  if (region === '') {
    region = 'us-east-1';
  }

  return {
    name: bucketName,
    region,
  };
};

export const createAirnodeBucket = async (cloudProvider: AwsCloudProvider) => {
  const s3 = initializeS3Service();
  const bucketName = generateBucketName();

  let createParams: AWS.S3.CreateBucketRequest = { Bucket: bucketName };
  // If the region is `us-east-1` the configuration must be empty...
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#createBucket-property
  if (cloudProvider.region !== 'us-east-1') {
    createParams = { ...createParams, CreateBucketConfiguration: { LocationConstraint: cloudProvider.region } };
  }

  logger.debug(`Creating S3 bucket '${bucketName}' in '${cloudProvider.region}'`);
  const goCreate = await go(() => s3.createBucket(createParams).promise());
  if (!goCreate.success) {
    throw new Error(`Failed to create an S3 bucket: ${goCreate.error}`);
  }

  // Enable bucket encryption
  logger.debug(`Setting encryption for S3 bucket '${bucketName}'`);
  const goPutEncryption = await go(() =>
    s3
      .putBucketEncryption({
        Bucket: bucketName,
        ServerSideEncryptionConfiguration: {
          Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }, BucketKeyEnabled: true }],
        },
      })
      .promise()
  );
  if (!goPutEncryption.success) {
    throw new Error(`Failed to enable encryption for bucket '${bucketName}': ${goPutEncryption.error}`);
  }

  // Blocking public access to the bucket
  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
  logger.debug(`Setting public access block for S3 bucket '${bucketName}'`);
  const goPutPublicAccessBlock = await go(() =>
    s3
      .putPublicAccessBlock({
        Bucket: bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      })
      .promise()
  );
  if (!goPutPublicAccessBlock.success) {
    throw new Error(
      `Failed to setup a public access block for bucket '${bucketName}': ${goPutPublicAccessBlock.error}`
    );
  }

  return {
    name: bucketName,
    region: cloudProvider.region,
  };
};

export const getBucketDirectoryStructure = async (bucketName: string) => {
  const s3 = initializeS3Service();

  let paths: string[] = [];
  let truncated = true;
  let listParams: AWS.S3.ListObjectsV2Request = {
    Bucket: bucketName,
  };

  while (truncated) {
    logger.debug(`Listing objects for S3 bucket '${bucketName}'`);
    const goList = await go(() => s3.listObjectsV2(listParams).promise());
    if (!goList.success) {
      throw new Error(`Failed to list content of bucket '${bucketName}': ${goList.error}`);
    }

    paths = concat(paths, compact(goList.data.Contents?.map((content) => content.Key)));
    truncated = !!goList.data.IsTruncated;
    if (goList.data.ContinuationToken) {
      listParams = { ...listParams, ContinuationToken: goList.data.ContinuationToken };
    }
  }

  return translatePathsToDirectoryStructure(paths);
};

export const storeFileToBucket = async (bucketName: string, bucketFilePath: string, filePath: string) => {
  const s3 = initializeS3Service();

  logger.debug(`Storing file '${filePath}' as '${bucketFilePath}' to S3 bucket '${bucketName}'`);
  const goPut = await go(() =>
    s3
      .putObject({ Bucket: bucketName, Key: bucketFilePath, Body: fs.readFileSync(filePath, { encoding: 'utf-8' }) })
      .promise()
  );
  if (!goPut.success) {
    throw new Error(`Failed to store file '${filePath}' to S3 bucket '${bucketName}': ${goPut.error}`);
  }
};

export const getFileFromBucket = async (bucketName: string, filePath: string) => {
  const s3 = initializeS3Service();

  logger.debug(`Fetching file '${filePath}' from S3 bucket '${bucketName}'`);
  const goGet = await go(() => s3.getObject({ Bucket: bucketName, Key: filePath }).promise());
  if (!goGet.success) {
    throw new Error(`Failed to fetch file '${filePath}' from S3 bucket '${bucketName}': ${goGet.error}`);
  }
  if (!goGet.data.Body) {
    throw new Error(`The response for file '${filePath}' from S3 bucket '${bucketName}' contained an empty body`);
  }

  return goGet.data.Body.toString('utf-8');
};

export const copyFileInBucket = async (bucketName: string, fromFilePath: string, toFilePath: string) => {
  const s3 = initializeS3Service();

  logger.debug(`Copying file '${fromFilePath}' to file '${toFilePath}' within S3 bucket '${bucketName}'`);
  const goCopy = await go(() =>
    s3.copyObject({ Bucket: bucketName, CopySource: `/${bucketName}/${fromFilePath}`, Key: toFilePath }).promise()
  );
  if (!goCopy.success) {
    throw new Error(
      `Failed to copy file '${fromFilePath}' to file '${toFilePath}' within S3 bucket '${bucketName}': ${goCopy.error}`
    );
  }
};

const gatherBucketKeys = (directory: Directory): string[] => [
  directory.bucketKey,
  ...Object.values(directory.children).reduce(
    (results: string[], fsItem) => [
      ...results,
      ...(fsItem.type === FileSystemType.File ? [fsItem.bucketKey] : gatherBucketKeys(fsItem)),
    ],
    []
  ),
];

export const deleteBucketDirectory = async (bucketName: string, directory: Directory) => {
  const s3 = initializeS3Service();

  const bucketKeys = gatherBucketKeys(directory);
  logger.debug(`Deleting files from S3 bucket '${bucketName}': ${JSON.stringify(bucketKeys)}`);
  const goDelete = await go(() =>
    s3
      .deleteObjects({ Bucket: bucketName, Delete: { Objects: bucketKeys.map((bucketKey) => ({ Key: bucketKey })) } })
      .promise()
  );
  if (!goDelete.success) {
    throw new Error(`Failed to delete bucket directory '${directory.bucketKey}' and its content: ${goDelete.error}`);
  }
};

export const deleteBucket = async (bucketName: string) => {
  const s3 = initializeS3Service();

  logger.debug(`Deleting S3 bucket '${bucketName}'`);
  const goDelete = await go(() => s3.deleteBucket({ Bucket: bucketName }).promise());
  if (!goDelete.success) {
    throw new Error(`Failed to delete S3 bucket '${bucketName}': ${goDelete.error}`);
  }
};
