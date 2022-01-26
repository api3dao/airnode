import AWS from 'aws-sdk';
import { AwsCloudProvider } from '@api3/airnode-node';
import * as logger from '../utils/logger';

async function deleteObjects(s3: AWS.S3, bucket: string, objects: AWS.S3.ObjectIdentifierList) {
  logger.debug(`Deleting objects ${JSON.stringify(objects)} from S3 bucket ${bucket}`);
  await s3
    .deleteObjects({
      Bucket: bucket,
      Delete: {
        Objects: objects.map(({ Key, VersionId }) => ({ Key, VersionId })),
      },
    })
    .promise();
}

async function fetchObjects(s3: AWS.S3, bucket: string) {
  logger.debug(`Fetching objects from S3 bucket ${bucket}`);
  const objectResults = await s3.listObjectVersions({ Bucket: bucket }).promise();
  const objects = [...(objectResults.Versions ?? []), ...(objectResults.DeleteMarkers ?? [])];
  return objects.filter((object): object is AWS.S3.ObjectIdentifier => !!object.Key);
}

async function emptyBucket(s3: AWS.S3, bucket: string) {
  logger.debug(`Emptying S3 bucket ${bucket}`);
  let objects = await fetchObjects(s3, bucket);

  // At most 1000 objects are fetched in one network request
  while (objects.length > 0) {
    await deleteObjects(s3, bucket, objects);

    objects = await fetchObjects(s3, bucket);
  }
}

async function deleteBucket(s3: AWS.S3, bucket: string) {
  logger.debug(`Removing S3 bucket ${bucket}`);
  await emptyBucket(s3, bucket);

  logger.debug(`Deleting S3 bucket ${bucket}`);
  await s3.deleteBucket({ Bucket: bucket }).promise();
}

export async function removeState(bucket: string, cloudProvider: AwsCloudProvider) {
  logger.debug('Removing Terraform state from AWS');
  const { region } = cloudProvider;
  AWS.config.update({ region });
  const s3 = new AWS.S3();

  await deleteBucket(s3, bucket);
}

async function bucketExists(s3: AWS.S3, bucket: string) {
  try {
    logger.debug(`Fetching S3 bucket ${bucket}`);
    await s3.headBucket({ Bucket: bucket }).promise();

    return true;
  } catch (err) {
    // Not found or forbidden
    logger.debug((err as Error).toString());
    return false;
  }
}

export async function stateExists(bucket: string, cloudProvider: AwsCloudProvider) {
  logger.debug('Checking Terraform state existence in AWS');
  const { region } = cloudProvider;
  AWS.config.update({ region });
  const s3 = new AWS.S3();

  return await bucketExists(s3, bucket);
}
