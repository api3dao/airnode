import AWS from 'aws-sdk';

async function deleteObjects(s3: AWS.S3, bucket: string, objects: AWS.S3.ObjectIdentifierList) {
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
  const objectResults = await s3.listObjectVersions({ Bucket: bucket }).promise();
  const objects = [...(objectResults.Versions ?? []), ...(objectResults.DeleteMarkers ?? [])];
  return objects.filter((object): object is AWS.S3.ObjectIdentifier => !!object.Key);
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

async function fileExists(s3: AWS.S3, bucket: string, file: string) {
  try {
    await s3.headObject({ Bucket: bucket, Key: file }).promise();

    return true;
  } catch (err) {
    // Not found or forbidden
    return false;
  }
}

async function dynamodbTableExists(dynamoDb: AWS.DynamoDB, dynamodbTable: string) {
  try {
    await dynamoDb.describeTable({ TableName: dynamodbTable }).promise();

    return true;
  } catch (err) {
    // Not found or forbidden
    return false;
  }
}

export async function stateExists(region: string, bucket: string, dynamodbTable: string) {
  AWS.config.update({ region });
  const s3 = new AWS.S3();
  const dynamoDb = new AWS.DynamoDB();

  return (await fileExists(s3, bucket, 'terraform.tfstate')) && (await dynamodbTableExists(dynamoDb, dynamodbTable));
}
