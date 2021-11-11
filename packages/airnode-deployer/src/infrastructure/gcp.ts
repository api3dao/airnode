import { GcpCloudProvider } from '@api3/airnode-node';
import { Storage } from '@google-cloud/storage';
import * as logger from '../utils/logger';

export async function stateExists(bucketName: string, cloudProvider: GcpCloudProvider) {
  logger.debug('Checking Terraform state existence in GCP');
  const { projectId } = cloudProvider;
  const storage = new Storage({ projectId });
  const bucket = storage.bucket(bucketName);

  return (await bucket.exists())[0] as boolean;
}

export async function removeState(bucketName: string, cloudProvider: GcpCloudProvider) {
  logger.debug('Removing Terraform state from GCP');
  const { projectId } = cloudProvider;
  const storage = new Storage({ projectId });
  const bucket = storage.bucket(bucketName);

  await bucket.deleteFiles({ force: true, versions: true });
  await bucket.delete();
}
