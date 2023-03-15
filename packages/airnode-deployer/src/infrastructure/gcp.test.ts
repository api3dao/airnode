import fs from 'fs';
import {
  copyFileInBucket,
  createAirnodeBucket,
  deleteBucket,
  deleteBucketDirectory,
  getAirnodeBucket,
  getBucketDirectoryStructure,
  getFileFromBucket,
  storeFileToBucket,
} from './gcp';
import { mockBucketDirectoryStructure, mockBucketDirectoryStructureList } from '../../test/fixtures';
import { Directory } from '../utils/infrastructure';
import { setLogsDirectory } from '../utils/logger';

const bucketName = 'airnode-aabbccdd0011';

const mockFile = {
  download: jest.fn(),
  copy: jest.fn(),
  delete: jest.fn(),
};

const mockBucket = {
  file: jest.fn(() => mockFile),
  setMetadata: jest.fn(),
  iam: {
    setPolicy: jest.fn(),
  },
  getFiles: jest.fn(),
  upload: jest.fn(),
  delete: jest.fn(),
  getMetadata: jest.fn(),
  name: bucketName,
};

const mockStorage = {
  bucket: jest.fn(() => mockBucket),
  getBuckets: jest.fn(),
  createBucket: jest.fn(),
};

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => mockStorage),
}));

jest.mock('../utils/infrastructure', () => ({
  ...jest.requireActual('../utils/infrastructure'),
  generateBucketName: jest.fn(),
}));

const gcsStorageSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage;
const gcsBucketSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket;
const gcsFileSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().file;
const gcsGetBucketsSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().getBuckets;
const gcsGetMetadataSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().getMetadata;
const gcsCreateBucketSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().createBucket;
const gcsSetMetadataSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().setMetadata;
const gcsSetPolicySpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().iam.setPolicy;
const gcsGetFilesSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().getFiles;
const gcsUploadSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().upload;
const gcsBucketDeleteSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().delete;
const gcsDownloadSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().file().download;
const gcsCopySpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().file().copy;
const gcsFileDeleteSpy: jest.SpyInstance = jest.requireMock('@google-cloud/storage').Storage().bucket().file().delete;
const generateBucketNameSpy: jest.SpyInstance = jest.requireMock('../utils/infrastructure').generateBucketName;

jest.spyOn(fs, 'appendFileSync').mockImplementation(() => jest.fn());
jest.spyOn(fs, 'mkdirSync').mockImplementation();
setLogsDirectory('/config/logs/');

const cloudProvider = {
  type: 'gcp' as const,
  region: 'us-east1',
  projectId: 'airnode-test-project-1234',
  disableConcurrencyReservations: false,
};
const bucket = {
  name: bucketName,
  region: 'us-east1',
};
const fileContent = 'file content';
const filePath = '/path/to/config.json';
const bucketFilePath = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json';
const gcsErrorMessage = 'Unexpected GCS error';
const gcsError = new Error(gcsErrorMessage);

describe('getAirnodeBucket', () => {
  it('returns Airnode GCS bucket', async () => {
    gcsGetBucketsSpy.mockImplementation(() => [[mockBucket]]);
    gcsGetMetadataSpy.mockImplementation(() => [{ location: 'us-east1' }]);

    const fetchedBucketName = await getAirnodeBucket();
    expect(fetchedBucketName).toEqual(bucket);
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsGetMetadataSpy).toHaveBeenCalledTimes(1);
  });

  it(`ignores incorrect Airnode GCS bucket names`, async () => {
    gcsGetBucketsSpy.mockImplementation(() => [[{ name: 'airnode-123456' }]]);

    const fetchedBucketName = await getAirnodeBucket();
    expect(fetchedBucketName).toBeNull();
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });

  it(`throws an error if can't fetch the list of GCS buckets`, async () => {
    gcsGetBucketsSpy.mockRejectedValue(gcsError);

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Failed to list GCS buckets: Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });

  it(`throws an error if can't fetch the bucket's metadata`, async () => {
    gcsGetBucketsSpy.mockImplementation(() => [[mockBucket]]);
    gcsGetMetadataSpy.mockRejectedValue(gcsError);

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Failed to fetch metadata for bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsGetMetadataSpy).toHaveBeenCalledTimes(1);
  });

  it(`throws an error if there are more then one Airnode GCS buckets`, async () => {
    const listBucketsResponse = [[{ name: bucketName }, { name: 'airnode-eeff99887766' }]];
    gcsGetBucketsSpy.mockImplementation(() => listBucketsResponse);

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Multiple Airnode buckets found, stopping. Buckets: ${JSON.stringify(listBucketsResponse[0])}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });
});

describe('createAirnodeBucket', () => {
  beforeEach(() => {
    gcsCreateBucketSpy.mockImplementation(() => [mockBucket]);
    gcsSetMetadataSpy.mockImplementation(() => {});
    gcsSetPolicySpy.mockImplementation(() => {});
    generateBucketNameSpy.mockImplementation(() => bucketName);
  });

  it('creates GCS Airnode bucket', async () => {
    await createAirnodeBucket(cloudProvider);

    expect(gcsCreateBucketSpy).toHaveBeenCalledWith(bucketName, { location: cloudProvider.region });
    expect(gcsSetMetadataSpy).toHaveBeenCalledWith({
      iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'enforced' },
    });
    expect(gcsSetPolicySpy).toHaveBeenCalledWith({
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
    });
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });

  it(`throws an error if can't create a bucket`, async () => {
    gcsCreateBucketSpy.mockRejectedValue(gcsError);

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to create an GCS bucket: Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });

  it(`throws an error if can't set uniform bucket-level access`, async () => {
    gcsSetMetadataSpy.mockRejectedValue(gcsError);

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to setup a uniform bucket-level access for bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });

  it(`throws an error if can't set IAM policy`, async () => {
    gcsSetPolicySpy.mockRejectedValue(gcsError);

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to setup IAM policy for bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
  });
});

describe('getBucketDirectoryStructure', () => {
  it('returns bucket directory structure', async () => {
    gcsGetFilesSpy.mockImplementation(() => [mockBucketDirectoryStructureList.map((path) => ({ name: path }))]);

    const directoryStructure = await getBucketDirectoryStructure(bucket);
    expect(directoryStructure).toEqual(mockBucketDirectoryStructure);
    expect(gcsGetFilesSpy).toHaveBeenCalled();
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
  });

  it(`throws an error if can't list bucket content`, async () => {
    gcsGetFilesSpy.mockRejectedValue(gcsError);

    await expect(getBucketDirectoryStructure(bucket)).rejects.toThrow(
      new Error(`Failed to list content of bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
  });
});

describe('storeFileToBucket', () => {
  it('stores file in GCS bucket', async () => {
    gcsUploadSpy.mockImplementation(() => {});

    await storeFileToBucket(bucket, bucketFilePath, filePath);
    expect(gcsUploadSpy).toHaveBeenCalled();
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
  });

  it(`throws an error if can't store file in bucket`, async () => {
    gcsUploadSpy.mockRejectedValue(gcsError);

    await expect(storeFileToBucket(bucket, bucketFilePath, filePath)).rejects.toThrow(
      new Error(`Failed to store file '${filePath}' to GCS bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
  });
});

describe('getFileFromBucket', () => {
  it('fetches file from GCS bucket', async () => {
    gcsDownloadSpy.mockImplementation(() => [fileContent]);

    const fetchedFileContent = await getFileFromBucket(bucket, bucketFilePath);
    expect(fetchedFileContent).toEqual(fileContent);
    expect(gcsDownloadSpy).toHaveBeenCalled();
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
    expect(gcsFileSpy).toHaveBeenCalledWith(bucketFilePath);
  });

  it(`throw an error if can't fetch file from bucket`, async () => {
    gcsDownloadSpy.mockRejectedValue(gcsError);

    await expect(getFileFromBucket(bucket, bucketFilePath)).rejects.toThrow(
      new Error(`Failed to fetch file '${bucketFilePath}' from GCS bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
    expect(gcsFileSpy).toHaveBeenCalledWith(bucketFilePath);
  });
});

describe('copyFileInBucket', () => {
  const toBucketFilePath = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662557994854/config.json';

  it('copies file within a bucket', async () => {
    gcsCopySpy.mockImplementation(() => {});

    await copyFileInBucket(bucket, bucketFilePath, toBucketFilePath);
    expect(gcsCopySpy).toHaveBeenCalledWith(toBucketFilePath);
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
    expect(gcsFileSpy).toHaveBeenCalledWith(bucketFilePath);
  });

  it(`throw an error if can't copy file within bucket`, async () => {
    gcsCopySpy.mockRejectedValue(gcsError);

    await expect(copyFileInBucket(bucket, bucketFilePath, toBucketFilePath)).rejects.toThrow(
      new Error(
        `Failed to copy file '${bucketFilePath}' to file '${toBucketFilePath}' within GCS bucket '${bucketName}': Error: ${gcsErrorMessage}`
      )
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
    expect(gcsFileSpy).toHaveBeenCalledWith(bucketFilePath);
  });
});

describe('deleteObjects', () => {
  const bucketKeys = mockBucketDirectoryStructureList.filter(
    (key) => key.startsWith('0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace') && !key.endsWith('/')
  );
  it('deletes GCS bucket directory and its content', async () => {
    gcsFileDeleteSpy.mockImplementation(() => {});

    await deleteBucketDirectory(
      bucket,
      mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
    bucketKeys.forEach((bucketKey) => {
      expect(gcsFileSpy).toHaveBeenCalledWith(bucketKey);
      expect(gcsFileDeleteSpy).toHaveBeenCalled();
    });
  });

  it(`throw an error if can't delete files from bucket`, async () => {
    gcsFileDeleteSpy.mockRejectedValue(gcsError);

    await expect(
      deleteBucketDirectory(
        bucket,
        mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory
      )
    ).rejects.toThrow(
      new Error(`Failed to delete bucket file '${bucketKeys.reverse()[0]}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
    expect(gcsFileSpy).toHaveBeenCalledWith(bucketFilePath);
  });
});

describe('deleteBucket', () => {
  it('deletes an empty GCS bucket', async () => {
    gcsBucketDeleteSpy.mockImplementation(() => {});

    await deleteBucket(bucket);
    expect(gcsBucketDeleteSpy).toHaveBeenCalledWith();
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
  });

  it(`throw an error if can't delete files from bucket`, async () => {
    gcsBucketDeleteSpy.mockRejectedValue(gcsError);

    await expect(deleteBucket(bucket)).rejects.toThrow(
      new Error(`Failed to delete GCS bucket '${bucketName}': Error: ${gcsErrorMessage}`)
    );
    expect(gcsStorageSpy).toHaveBeenCalledTimes(1);
    expect(gcsBucketSpy).toHaveBeenCalledWith(bucketName);
  });
});
