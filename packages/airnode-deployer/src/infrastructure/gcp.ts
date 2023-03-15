import { GcpCloudProvider } from '@api3/airnode-node';
import { go } from '@api3/promise-utils';
import { Storage } from '@google-cloud/storage';
import {
  Bucket,
  BUCKET_NAME_REGEX,
  Directory,
  FileSystemType,
  generateBucketName,
  translatePathsToDirectoryStructure,
} from '../utils/infrastructure';
import * as logger from '../utils/logger';

const initializeGcsService = () => new Storage();

const initializeGcsBucket = (bucketName: string) => initializeGcsService().bucket(bucketName);

export const getAirnodeBucket = async () => {
  const storage = initializeGcsService();

  logger.debug('Listing GCS buckets');
  const goBuckets = await go(() => storage.getBuckets());
  if (!goBuckets.success) {
    throw new Error(`Failed to list GCS buckets: ${goBuckets.error}`);
  }

  const [buckets] = goBuckets.data;
  const airnodeBuckets = buckets.filter((bucket) => bucket.name.match(BUCKET_NAME_REGEX));
  if (airnodeBuckets.length > 1) {
    throw new Error(`Multiple Airnode buckets found, stopping. Buckets: ${JSON.stringify(airnodeBuckets)}`);
  }

  const bucket = airnodeBuckets[0];
  if (!bucket) {
    logger.debug('No Airnode GCS bucket found');
    return null;
  }

  const goMetadata = await go(() => bucket.getMetadata());
  if (!goMetadata.success) {
    throw new Error(`Failed to fetch metadata for bucket '${bucket.name}': ${goMetadata.error}`);
  }

  return {
    name: bucket.name,
    region: goMetadata.data[0].location as string,
  };
};

export const createAirnodeBucket = async (cloudProvider: GcpCloudProvider) => {
  const storage = initializeGcsService();
  const bucketName = generateBucketName();

  logger.debug(`Creating GCS bucket '${bucketName}' in ${cloudProvider.region}`);
  const goCreate = await go(() => storage.createBucket(bucketName, { location: cloudProvider.region }));
  if (!goCreate.success) {
    throw new Error(`Failed to create an GCS bucket: ${goCreate.error}`);
  }

  const [bucket] = goCreate.data;

  // Setting uniform bucket-level access
  // https://cloud.google.com/storage/docs/uniform-bucket-level-access
  logger.debug(`Setting uniform bucket-level access for GCS bucket '${bucketName}'`);
  const goMetadata = await go(() =>
    bucket.setMetadata({
      iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'enforced' },
    })
  );
  if (!goMetadata.success) {
    throw new Error(`Failed to setup a uniform bucket-level access for bucket '${bucketName}': ${goMetadata.error}`);
  }

  // Adding roles that are by default added when adding bucket via GCP Console. Some are missing when creating bucket via SDK,
  // causing user not being able to see the bucket content in the GCP Console.
  const policy = {
    bindings: [
      {
        role: 'roles/storage.legacyBucketReader',
        members: [`projectViewer:${cloudProvider.projectId}`],
      },
      {
        role: 'roles/storage.legacyBucketOwner',
        members: [`projectEditor:${cloudProvider.projectId}`, `projectOwner:${cloudProvider.projectId}`],
      },
      {
        role: 'roles/storage.legacyObjectReader',
        members: [`projectViewer:${cloudProvider.projectId}`],
      },
      {
        role: 'roles/storage.legacyObjectOwner',
        members: [`projectEditor:${cloudProvider.projectId}`, `projectOwner:${cloudProvider.projectId}`],
      },
    ],
  };
  logger.debug(`Setting necessary IAM policy for GCS bucket '${bucketName}'`);
  const goPolicy = await go(() => bucket.iam.setPolicy(policy));
  if (!goPolicy.success) {
    throw new Error(`Failed to setup IAM policy for bucket '${bucketName}': ${goPolicy.error}`);
  }

  return {
    name: bucketName,
    region: cloudProvider.region,
  };
};

export const getBucketDirectoryStructure = async (bucket: Bucket) => {
  const { name: bucketName } = bucket;
  const gcsBucket = initializeGcsBucket(bucketName);

  const goGet = await go(() => gcsBucket.getFiles());
  if (!goGet.success) {
    throw new Error(`Failed to list content of bucket '${bucketName}': ${goGet.error}`);
  }

  return translatePathsToDirectoryStructure(goGet.data[0].map((file) => file.name));
};

export const storeFileToBucket = async (bucket: Bucket, bucketFilePath: string, filePath: string) => {
  const { name: bucketName } = bucket;
  const gcsBucket = initializeGcsBucket(bucketName);

  logger.debug(`Storing file '${filePath}' as '${bucketFilePath}' to GCS bucket '${bucketName}'`);
  const goSave = await go(() => gcsBucket.upload(filePath, { destination: bucketFilePath }));
  if (!goSave.success) {
    throw new Error(`Failed to store file '${filePath}' to GCS bucket '${bucketName}': ${goSave.error}`);
  }
};

export const getFileFromBucket = async (bucket: Bucket, filePath: string) => {
  const { name: bucketName } = bucket;
  const gcsBucket = initializeGcsBucket(bucketName);
  const file = gcsBucket.file(filePath);

  logger.debug(`Fetching file '${filePath}' from GCS bucket '${bucketName}'`);
  const goDownload = await go(() => file.download());
  if (!goDownload.success) {
    throw new Error(`Failed to fetch file '${filePath}' from GCS bucket '${bucketName}': ${goDownload.error}`);
  }

  return goDownload.data[0].toString('utf-8');
};

export const copyFileInBucket = async (bucket: Bucket, fromFilePath: string, toFilePath: string) => {
  const { name: bucketName } = bucket;
  const gcsBucket = initializeGcsBucket(bucketName);
  const file = gcsBucket.file(fromFilePath);

  logger.debug(`Copying file '${fromFilePath}' to file '${toFilePath}' within GCS bucket '${bucketName}'`);
  const goCopy = await go(() => file.copy(toFilePath));
  if (!goCopy.success) {
    throw new Error(
      `Failed to copy file '${fromFilePath}' to file '${toFilePath}' within GCS bucket '${bucketName}': ${goCopy.error}`
    );
  }
};

const gatherBucketKeys = (directory: Directory): string[] => [
  ...Object.values(directory.children).reduce(
    (results: string[], fsItem) => [
      ...results,
      ...(fsItem.type === FileSystemType.File ? [fsItem.bucketKey] : gatherBucketKeys(fsItem)),
    ],
    []
  ),
];

export const deleteBucketDirectory = async (bucket: Bucket, directory: Directory) => {
  const { name: bucketName } = bucket;
  const gcsBucket = initializeGcsBucket(bucketName);

  const bucketKeys = gatherBucketKeys(directory);
  logger.debug(`Deleting files from GCS bucket '${bucketName}': ${JSON.stringify(bucketKeys)}`);
  for (const bucketKey of bucketKeys.reverse()) {
    // I could use Bucket.deleteFiles() instead but you can't list the files to be deleted and it makes multiple API calls anyway
    logger.debug(`Deleting file '${gcsBucket}' from GCS bucket '${bucketName}'`);
    const goDelete = await go(() => gcsBucket.file(bucketKey).delete());
    if (!goDelete.success) {
      throw new Error(`Failed to delete bucket file '${bucketKey}': ${goDelete.error}`);
    }
  }
};

export const deleteBucket = async (bucket: Bucket) => {
  const { name: bucketName } = bucket;
  const gcsBucket = initializeGcsBucket(bucketName);

  logger.debug(`Deleting GCS bucket '${bucketName}'`);
  const goDelete = await go(() => gcsBucket.delete());
  if (!goDelete.success) {
    throw new Error(`Failed to delete GCS bucket '${bucketName}': ${goDelete.error}`);
  }
};
