import AWS from 'aws-sdk';
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

async function deleteDynamodbTable(dynamoDb: AWS.DynamoDB, dynamodbTable: string) {
  logger.debug(`Removing DynamoDB table ${dynamodbTable}`);
  await dynamoDb.deleteTable({ TableName: dynamodbTable }).promise();
}

export async function removeDeployment(region: string, bucket: string, dynamodbTable: string) {
  logger.debug('Removing Terraform state from AWS');
  AWS.config.update({ region });
  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB();

  await deleteBucket(s3, bucket);
  await deleteDynamodbTable(dynamoDb, dynamodbTable);
}

async function fileExists(s3: AWS.S3, bucket: string, file: string) {
  try {
    logger.debug(`Fetching file ${file} from S3 bucket ${bucket}`);
    await s3.headObject({ Bucket: bucket, Key: file }).promise();

    return true;
  } catch (err) {
    // Not found or forbidden
    logger.debug(err.toString());
    return false;
  }
}

async function dynamodbTableExists(dynamoDb: AWS.DynamoDB, dynamodbTable: string) {
  try {
    logger.debug(`Fetching DynamoDB table ${dynamodbTable} info`);
    await dynamoDb.describeTable({ TableName: dynamodbTable }).promise();

    return true;
  } catch (err) {
    // Not found or forbidden
    logger.debug(err.toString());
    return false;
  }
}

export async function stateExists(region: string, bucket: string, dynamodbTable: string) {
  logger.debug('Checking Terraform state existence in AWS');
  AWS.config.update({ region });
  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB();

  return (await fileExists(s3, bucket, 'terraform.tfstate')) && (await dynamodbTableExists(dynamoDb, dynamodbTable));
}
