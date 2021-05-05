import AWS from 'aws-sdk';

async function deleteObjects(s3: AWS.S3, bucket: string, objects: AWS.S3.DeleteMarkerEntry[]) {
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
  const objects = await s3.listObjectVersions({ Bucket: bucket }).promise();
  return [...objects.Versions, ...objects.DeleteMarkers];
}

async function emptyBucket(s3: AWS.S3, bucket: string) {
  let objects = await fetchObjects(s3, bucket);

  // At most 1000 objects are fetched in one network request
  while (objects.length > 0) {
    await deleteObjects(s3, bucket, objects);

    objects = await fetchObjects(s3, bucket);
  }
}

async function deleteBucket(s3: AWS.S3, bucket: string) {
  await emptyBucket(s3, bucket);
  await s3.deleteBucket({ Bucket: bucket }).promise();
}

async function deleteDynamodbTable(dynamoDb: AWS.DynamoDB, dynamodbTable: string) {
  await dynamoDb.deleteTable({ TableName: dynamodbTable }).promise();
}

export async function removeDeployment(region: string, bucket: string, dynamodbTable: string) {
  AWS.config.update({ region });
  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB();

  await deleteBucket(s3, bucket);
  await deleteDynamodbTable(dynamoDb, dynamodbTable);
}
