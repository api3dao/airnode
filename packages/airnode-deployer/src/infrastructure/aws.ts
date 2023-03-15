import * as fs from 'fs';
import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  CreateBucketCommand,
  CreateBucketCommandInput,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import concat from 'lodash/concat';
import compact from 'lodash/compact';
import { AwsCloudProvider } from '@api3/airnode-node';
import { go } from '@api3/promise-utils';
import * as logger from '../utils/logger';
import {
  BUCKET_NAME_REGEX,
  Bucket,
  Directory,
  FileSystemType,
  generateBucketName,
  translatePathsToDirectoryStructure,
} from '../utils/infrastructure';

const DEFAULT_AWS_REGION = 'us-east-1';

const initializeS3Service = (region: string) => {
  return new S3Client({ region });
};

export const getAirnodeBucket = async () => {
  // We're using a default region here because we don't know where is the bucket stored at this point.
  const s3 = initializeS3Service(DEFAULT_AWS_REGION);

  logger.debug('Listing S3 buckets');
  const bucketsCommand = new ListBucketsCommand({});
  const goBuckets = await go(() => s3.send(bucketsCommand));
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

  const bucketLocationCommand = new GetBucketLocationCommand({ Bucket: bucketName });
  const goBucketLocation = await go(() => s3.send(bucketLocationCommand));
  if (!goBucketLocation.success) {
    throw new Error(`Failed to get location for bucket '${bucketName}': ${goBucketLocation.error}`);
  }

  let region = goBucketLocation.data.LocationConstraint;
  // The `EU` option is listed as a possible one in the documentation
  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLocation.html#API_GetBucketLocation_ResponseElements
  if (region === 'EU') {
    throw new Error(`Unknown bucket region '${region}'`);
  }
  // The documentation says that for buckets in the `us-east-1` region the value of `LocationConstraint` is null but it is actually undefined
  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLocation.html#API_GetBucketLocation_ResponseElements
  if (region === undefined) {
    region = 'us-east-1';
  }

  return {
    name: bucketName,
    region,
  };
};

export const createAirnodeBucket = async (cloudProvider: AwsCloudProvider) => {
  // If there's no Airnode bucket already available we create it in the region where the Airnode resources will be deployed
  const s3 = initializeS3Service(cloudProvider.region);
  const bucketName = generateBucketName();

  let createParams: CreateBucketCommandInput = { Bucket: bucketName };
  // If the region is `us-east-1` the configuration must be empty...
  // https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html#API_CreateBucket_RequestBody
  if (cloudProvider.region !== 'us-east-1') {
    createParams = { ...createParams, CreateBucketConfiguration: { LocationConstraint: cloudProvider.region } };
  }

  logger.debug(`Creating S3 bucket '${bucketName}' in '${cloudProvider.region}'`);
  const createCommand = new CreateBucketCommand(createParams);
  const goCreate = await go(() => s3.send(createCommand));
  if (!goCreate.success) {
    throw new Error(`Failed to create an S3 bucket: ${goCreate.error}`);
  }

  // Enable bucket encryption
  logger.debug(`Setting encryption for S3 bucket '${bucketName}'`);
  const putEncryptionCommand = new PutBucketEncryptionCommand({
    Bucket: bucketName,
    ServerSideEncryptionConfiguration: {
      Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }, BucketKeyEnabled: true }],
    },
  });
  const goPutEncryption = await go(() => s3.send(putEncryptionCommand));
  if (!goPutEncryption.success) {
    throw new Error(`Failed to enable encryption for bucket '${bucketName}': ${goPutEncryption.error}`);
  }

  // Blocking public access to the bucket
  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
  logger.debug(`Setting public access block for S3 bucket '${bucketName}'`);
  const putPublicAccessBlockCommand = new PutPublicAccessBlockCommand({
    Bucket: bucketName,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
  const goPutPublicAccessBlock = await go(() => s3.send(putPublicAccessBlockCommand));
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

export const getBucketDirectoryStructure = async (bucket: Bucket) => {
  const { name: bucketName, region: bucketRegion } = bucket;
  const s3 = initializeS3Service(bucketRegion);

  let paths: string[] = [];
  let truncated = true;
  let listParams: ListObjectsV2CommandInput = {
    Bucket: bucketName,
  };

  while (truncated) {
    logger.debug(`Listing objects for S3 bucket '${bucketName}'`);
    const listCommand = new ListObjectsV2Command(listParams);
    const goList = await go(() => s3.send(listCommand));
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

export const storeFileToBucket = async (bucket: Bucket, bucketFilePath: string, filePath: string) => {
  const { name: bucketName, region: bucketRegion } = bucket;
  const s3 = initializeS3Service(bucketRegion);

  logger.debug(`Storing file '${filePath}' as '${bucketFilePath}' to S3 bucket '${bucketName}'`);
  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: bucketFilePath,
    Body: fs.readFileSync(filePath, { encoding: 'utf-8' }),
  });
  const goPut = await go(() => s3.send(putCommand));
  if (!goPut.success) {
    throw new Error(`Failed to store file '${filePath}' to S3 bucket '${bucketName}': ${goPut.error}`);
  }
};

export const getFileFromBucket = async (bucket: Bucket, filePath: string) => {
  const { name: bucketName, region: bucketRegion } = bucket;
  const s3 = initializeS3Service(bucketRegion);

  logger.debug(`Fetching file '${filePath}' from S3 bucket '${bucketName}'`);
  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: filePath });
  const goGet = await go(() => s3.send(getCommand));
  if (!goGet.success) {
    throw new Error(`Failed to fetch file '${filePath}' from S3 bucket '${bucketName}': ${goGet.error}`);
  }
  if (!goGet.data.Body) {
    throw new Error(`The response for file '${filePath}' from S3 bucket '${bucketName}' contained an empty body`);
  }

  const goFileContent = await go(() => goGet.data.Body!.transformToString('utf-8'));
  if (!goFileContent.success) {
    throw new Error(`The response for file '${filePath}' from S3 bucket '${bucketName}' is not parsable`);
  }

  return goFileContent.data;
};

export const copyFileInBucket = async (bucket: Bucket, fromFilePath: string, toFilePath: string) => {
  const { name: bucketName, region: bucketRegion } = bucket;
  const s3 = initializeS3Service(bucketRegion);

  logger.debug(`Copying file '${fromFilePath}' to file '${toFilePath}' within S3 bucket '${bucketName}'`);
  const copyCommand = new CopyObjectCommand({
    Bucket: bucketName,
    CopySource: `/${bucketName}/${fromFilePath}`,
    Key: toFilePath,
  });
  const goCopy = await go(() => s3.send(copyCommand));
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

export const deleteBucketDirectory = async (bucket: Bucket, directory: Directory) => {
  const { name: bucketName, region: bucketRegion } = bucket;
  const s3 = initializeS3Service(bucketRegion);

  const bucketKeys = gatherBucketKeys(directory);
  logger.debug(`Deleting files from S3 bucket '${bucketName}': ${JSON.stringify(bucketKeys)}`);
  const deleteCommand = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: { Objects: bucketKeys.map((bucketKey) => ({ Key: bucketKey })) },
  });
  const goDelete = await go(() => s3.send(deleteCommand));
  if (!goDelete.success) {
    throw new Error(`Failed to delete bucket directory '${directory.bucketKey}' and its content: ${goDelete.error}`);
  }
};

export const deleteBucket = async (bucket: Bucket) => {
  const { name: bucketName, region: bucketRegion } = bucket;
  const s3 = initializeS3Service(bucketRegion);

  logger.debug(`Deleting S3 bucket '${bucketName}'`);
  const deleteCommand = new DeleteBucketCommand({ Bucket: bucketName });
  const goDelete = await go(() => s3.send(deleteCommand));
  if (!goDelete.success) {
    throw new Error(`Failed to delete S3 bucket '${bucketName}': ${goDelete.error}`);
  }
};
