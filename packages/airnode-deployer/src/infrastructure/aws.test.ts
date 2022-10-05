import fs from 'fs';
import {
  getAirnodeBucket,
  createAirnodeBucket,
  getBucketDirectoryStructure,
  storeFileToBucket,
  getFileFromBucket,
  copyFileInBucket,
  deleteBucketDirectory,
  deleteBucket,
} from './aws';
import { mockBucketDirectoryStructure, mockBucketDirectoryStructureList } from '../../test/fixtures';
import { Directory } from '../utils/infrastructure';

const mockPromise = (fn: Function) => () => ({ promise: fn });

const mockS3 = {
  listBuckets: jest.fn(),
  createBucket: jest.fn(),
  putBucketEncryption: jest.fn(),
  putPublicAccessBlock: jest.fn(),
  listObjectsV2: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  copyObject: jest.fn(),
  deleteObjects: jest.fn(),
  deleteBucket: jest.fn(),
  getBucketLocation: jest.fn(),
};

jest.mock('aws-sdk', () => ({
  config: {
    update: jest.fn(),
  },
  S3: jest.fn(() => mockS3),
}));

jest.mock('../utils/infrastructure', () => ({
  ...jest.requireActual('../utils/infrastructure'),
  generateBucketName: jest.fn(),
}));

const awsListBucketsSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().listBuckets;
const awsGetBucketLocationSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().getBucketLocation;
const awsCreateBucketSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().createBucket;
const awsPutBucketEncryptionSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().putBucketEncryption;
const awsPutPublicAccessBlockSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().putPublicAccessBlock;
const awsListObjectsV2Spy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().listObjectsV2;
const awsPutObjectSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().putObject;
const awsGetObjectSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().getObject;
const awsCopyObjectSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().copyObject;
const awsDeleteObjectsSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().deleteObjects;
const awsDeleteBucketSpy: jest.SpyInstance = jest.requireMock('aws-sdk').S3().deleteBucket;
const generateBucketNameSpy: jest.SpyInstance = jest.requireMock('../utils/infrastructure').generateBucketName;

const cloudProvider = {
  type: 'aws' as const,
  region: 'us-east-1',
  disableConcurrencyReservations: false,
};
const bucketName = 'airnode-aabbccdd0011';
const bucket = {
  name: bucketName,
  region: 'us-east-1',
};
const fileContent = 'file content';
const filePath = '/path/to/config.json';
const bucketFilePath = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json';
const s3ErrorMessage = 'Unexpected S3 error';
const s3Error = new Error(s3ErrorMessage);

describe('getAirnodeBucket', () => {
  it('returns Airnode S3 bucket', async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(() => ({ Buckets: [{ Name: bucketName }] })));
    awsGetBucketLocationSpy.mockImplementation(mockPromise(() => ({ LocationConstraint: 'us-east-1' })));

    const fetchedBucket = await getAirnodeBucket();
    expect(fetchedBucket).toEqual(bucket);
  });

  it(`ignores incorrect Airnode S3 bucket names`, async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(() => ({ Buckets: [{ Name: 'airnode-123456' }] })));

    const fetchedBucket = await getAirnodeBucket();
    expect(fetchedBucket).toBeNull();
  });

  it('returns a region `us-east-1` if the location is an empty string', async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(() => ({ Buckets: [{ Name: bucketName }] })));
    awsGetBucketLocationSpy.mockImplementation(mockPromise(() => ({ LocationConstraint: '' })));

    const fetchedBucket = await getAirnodeBucket();
    expect(fetchedBucket).toEqual(bucket);
  });

  it(`throws an error if can't fetch the list of S3 buckets`, async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(getAirnodeBucket()).rejects.toThrow(new Error(`Failed to list S3 buckets: Error: ${s3ErrorMessage}`));
  });

  it(`throws an error if can't fetch the bucket's location`, async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(() => ({ Buckets: [{ Name: bucketName }] })));
    awsGetBucketLocationSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Failed to get location for bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });

  it(`throws an error if the location is not available`, async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(() => ({ Buckets: [{ Name: bucketName }] })));
    awsGetBucketLocationSpy.mockImplementation(mockPromise(() => ({ LocationConstraint: null })));

    await expect(getAirnodeBucket()).rejects.toThrow(new Error(`Unknown bucket region 'null'`));
  });

  it(`throws an error if the location is 'EU'`, async () => {
    awsListBucketsSpy.mockImplementation(mockPromise(() => ({ Buckets: [{ Name: bucketName }] })));
    awsGetBucketLocationSpy.mockImplementation(mockPromise(() => ({ LocationConstraint: 'EU' })));

    await expect(getAirnodeBucket()).rejects.toThrow(new Error(`Unknown bucket region 'EU'`));
  });

  it(`throws an error if there are more then one Airnode S3 buckets`, async () => {
    const listBucketsResponse = { Buckets: [{ Name: bucketName }, { Name: 'airnode-eeff99887766' }] };
    awsListBucketsSpy.mockImplementation(mockPromise(() => listBucketsResponse));

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Multiple Airnode buckets found, stopping. Buckets: ${JSON.stringify(listBucketsResponse.Buckets)}`)
    );
  });
});

describe('createAirnodeBucket', () => {
  beforeEach(() => {
    awsCreateBucketSpy.mockImplementation(mockPromise(() => {}));
    awsPutBucketEncryptionSpy.mockImplementation(mockPromise(() => {}));
    awsPutPublicAccessBlockSpy.mockImplementation(mockPromise(() => {}));
    generateBucketNameSpy.mockImplementation(() => bucketName);
  });

  it(`creates S3 Airnode bucket with no options for 'us-east-1' region`, async () => {
    await createAirnodeBucket(cloudProvider);

    expect(awsCreateBucketSpy).toHaveBeenCalledWith({ Bucket: bucketName });
    expect(awsPutBucketEncryptionSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }, BucketKeyEnabled: true }],
      },
    });
    expect(awsPutPublicAccessBlockSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it(`creates S3 Airnode bucket with options for other than 'us-east-1' region`, async () => {
    await createAirnodeBucket({ ...cloudProvider, region: 'europe-central-1' });

    expect(awsCreateBucketSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      CreateBucketConfiguration: { LocationConstraint: 'europe-central-1' },
    });
    expect(awsPutBucketEncryptionSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }, BucketKeyEnabled: true }],
      },
    });
    expect(awsPutPublicAccessBlockSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it(`throws an error if can't create a bucket`, async () => {
    awsCreateBucketSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to create an S3 bucket: Error: ${s3ErrorMessage}`)
    );
  });

  it(`throws an error if can't set encryption`, async () => {
    awsPutBucketEncryptionSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to enable encryption for bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });

  it(`throws an error if can't set public access`, async () => {
    awsPutPublicAccessBlockSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to setup a public access block for bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });
});

describe('getBucketDirectoryStructure', () => {
  it('returns bucket directory structure', async () => {
    awsListObjectsV2Spy.mockImplementation(
      mockPromise(() => ({
        Contents: mockBucketDirectoryStructureList.map((path) => ({ Key: path })),
        IsTruncated: false,
      }))
    );

    const directoryStructure = await getBucketDirectoryStructure(bucketName);
    expect(directoryStructure).toEqual(mockBucketDirectoryStructure);
    expect(awsListObjectsV2Spy).toHaveBeenCalledWith({ Bucket: bucketName });
  });

  it(`throws an error if can't list bucket content`, async () => {
    awsListObjectsV2Spy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(getBucketDirectoryStructure(bucketName)).rejects.toThrow(
      new Error(`Failed to list content of bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });
});

describe('storeFileToBucket', () => {
  beforeEach(() => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => fileContent);
  });

  it('stores file in S3 bucket', async () => {
    awsPutObjectSpy.mockImplementation(mockPromise(() => {}));

    await storeFileToBucket(bucketName, bucketFilePath, filePath);
    expect(awsPutObjectSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      Key: bucketFilePath,
      Body: fileContent,
    });
  });

  it(`throws an error if can't store file in bucket`, async () => {
    awsPutObjectSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(storeFileToBucket(bucketName, bucketFilePath, filePath)).rejects.toThrow(
      new Error(`Failed to store file '${filePath}' to S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });
});

describe('getFileFromBucket', () => {
  it('fetches file from S3 bucket', async () => {
    awsGetObjectSpy.mockImplementation(mockPromise(() => ({ Body: fileContent })));

    const fetchedFileContent = await getFileFromBucket(bucketName, bucketFilePath);
    expect(fetchedFileContent).toEqual(fileContent);
    expect(awsGetObjectSpy).toHaveBeenCalledWith({ Bucket: bucketName, Key: bucketFilePath });
  });

  it(`throw an error if can't fetch file from bucket`, async () => {
    awsGetObjectSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(getFileFromBucket(bucketName, bucketFilePath)).rejects.toThrow(
      new Error(`Failed to fetch file '${bucketFilePath}' from S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });
});

describe('copyFileInBucket', () => {
  const toBucketFilePath = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662557994854/config.json';

  it('copies file within a bucket', async () => {
    awsCopyObjectSpy.mockImplementation(mockPromise(() => {}));

    await copyFileInBucket(bucketName, bucketFilePath, toBucketFilePath);
    expect(awsCopyObjectSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      CopySource: `/${bucketName}/${bucketFilePath}`,
      Key: toBucketFilePath,
    });
  });

  it(`throw an error if can't copy file within bucket`, async () => {
    awsCopyObjectSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(copyFileInBucket(bucketName, bucketFilePath, toBucketFilePath)).rejects.toThrow(
      new Error(
        `Failed to copy file '${bucketFilePath}' to file '${toBucketFilePath}' within S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`
      )
    );
  });
});

describe('deleteObjects', () => {
  it('deletes S3 bucket directory and its content', async () => {
    const bucketKeys = mockBucketDirectoryStructureList.filter((key) =>
      key.startsWith('0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace')
    );
    awsDeleteObjectsSpy.mockImplementation(mockPromise(() => {}));

    await deleteBucketDirectory(
      bucketName,
      mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory
    );
    expect(awsDeleteObjectsSpy).toHaveBeenCalledWith({
      Bucket: bucketName,
      Delete: { Objects: bucketKeys.map((bucketKey) => ({ Key: bucketKey })) },
    });
  });

  it(`throw an error if can't delete files from bucket`, async () => {
    awsDeleteObjectsSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(
      deleteBucketDirectory(
        bucketName,
        mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory
      )
    ).rejects.toThrow(
      new Error(
        `Failed to delete bucket directory '${mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'].bucketKey}' and its content: Error: ${s3ErrorMessage}`
      )
    );
  });
});

describe('deleteBucket', () => {
  it('deletes an empty S3 bucket', async () => {
    awsDeleteBucketSpy.mockImplementation(mockPromise(() => {}));

    await deleteBucket(bucketName);
    expect(awsDeleteBucketSpy).toHaveBeenCalledWith({ Bucket: bucketName });
  });

  it(`throw an error if can't delete files from bucket`, async () => {
    awsDeleteBucketSpy.mockImplementation(mockPromise(jest.fn().mockRejectedValue(s3Error)));

    await expect(deleteBucket(bucketName)).rejects.toThrow(
      new Error(`Failed to delete S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
  });
});
