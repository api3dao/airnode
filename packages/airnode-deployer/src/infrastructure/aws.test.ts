import fs from 'fs';
import { Readable } from 'stream';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  CreateBucketCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@aws-sdk/util-stream-node';
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
import { setLogsDirectory } from '../utils/logger';

jest.mock('../utils/infrastructure', () => ({
  ...jest.requireActual('../utils/infrastructure'),
  generateBucketName: jest.fn(),
}));

const mockS3Client = mockClient(S3Client);
const generateBucketNameSpy: jest.SpyInstance = jest.requireMock('../utils/infrastructure').generateBucketName;
jest.spyOn(fs, 'appendFileSync').mockImplementation(() => jest.fn());
jest.spyOn(fs, 'mkdirSync').mockImplementation();
setLogsDirectory('/config/logs/');

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
  const mockListBucketsCommandInput = {};
  const mockGetBucketLocationCommandInput = { Bucket: bucketName };

  beforeEach(() => {
    mockS3Client.reset();
  });

  it('returns Airnode S3 bucket', async () => {
    mockS3Client
      .on(ListBucketsCommand, mockListBucketsCommandInput)
      .resolves({ Buckets: [{ Name: bucketName }] })
      .on(GetBucketLocationCommand, mockGetBucketLocationCommandInput)
      .resolves({ LocationConstraint: 'us-east-1' });

    const fetchedBucket = await getAirnodeBucket();
    expect(fetchedBucket).toEqual(bucket);
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(GetBucketLocationCommand, mockGetBucketLocationCommandInput);
  });

  it(`ignores incorrect Airnode S3 bucket names`, async () => {
    mockS3Client
      .on(ListBucketsCommand, mockListBucketsCommandInput)
      .resolves({ Buckets: [{ Name: 'airnode-123456' }] });

    const fetchedBucket = await getAirnodeBucket();
    expect(fetchedBucket).toBeNull();
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
  });

  it('returns a region `us-east-1` if the location is undefined', async () => {
    mockS3Client
      .on(ListBucketsCommand, mockListBucketsCommandInput)
      .resolves({ Buckets: [{ Name: bucketName }] })
      .on(GetBucketLocationCommand, mockGetBucketLocationCommandInput)
      .resolves({ LocationConstraint: undefined });

    const fetchedBucket = await getAirnodeBucket();
    expect(fetchedBucket).toEqual(bucket);
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(GetBucketLocationCommand, mockGetBucketLocationCommandInput);
  });

  it(`throws an error if can't fetch the list of S3 buckets`, async () => {
    mockS3Client.on(ListBucketsCommand, mockListBucketsCommandInput).rejects(s3Error);

    await expect(getAirnodeBucket()).rejects.toThrow(new Error(`Failed to list S3 buckets: Error: ${s3ErrorMessage}`));
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
  });

  it(`throws an error if can't fetch the bucket's location`, async () => {
    mockS3Client
      .on(ListBucketsCommand, mockListBucketsCommandInput)
      .resolves({ Buckets: [{ Name: bucketName }] })
      .on(GetBucketLocationCommand, mockGetBucketLocationCommandInput)
      .rejects(s3Error);

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Failed to get location for bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(GetBucketLocationCommand, mockGetBucketLocationCommandInput);
  });

  it(`throws an error if the location is 'EU'`, async () => {
    mockS3Client
      .on(ListBucketsCommand, mockListBucketsCommandInput)
      .resolves({ Buckets: [{ Name: bucketName }] })
      .on(GetBucketLocationCommand, mockGetBucketLocationCommandInput)
      .resolves({ LocationConstraint: 'EU' });

    await expect(getAirnodeBucket()).rejects.toThrow(new Error(`Unknown bucket region 'EU'`));
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(GetBucketLocationCommand, mockGetBucketLocationCommandInput);
  });

  it(`throws an error if there are more then one Airnode S3 buckets`, async () => {
    const listBucketsResponse = { Buckets: [{ Name: bucketName }, { Name: 'airnode-eeff99887766' }] };
    mockS3Client.on(ListBucketsCommand, mockListBucketsCommandInput).resolves(listBucketsResponse);

    await expect(getAirnodeBucket()).rejects.toThrow(
      new Error(`Multiple Airnode buckets found, stopping. Buckets: ${JSON.stringify(listBucketsResponse.Buckets)}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(ListBucketsCommand, mockListBucketsCommandInput);
  });
});

describe('createAirnodeBucket', () => {
  const mockCreateBucketCommandInput = { Bucket: bucketName };
  const mockPutBucketEncryptionCommandInput = {
    Bucket: bucketName,
    ServerSideEncryptionConfiguration: {
      Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' }, BucketKeyEnabled: true }],
    },
  };
  const mockPutPublicAccessBlockCommandInput = {
    Bucket: bucketName,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  };

  beforeEach(() => {
    mockS3Client.reset();
    generateBucketNameSpy.mockImplementation(() => bucketName);
  });

  it(`creates S3 Airnode bucket with no options for 'us-east-1' region`, async () => {
    mockS3Client
      .on(CreateBucketCommand, mockCreateBucketCommandInput)
      .resolves({})
      .on(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput)
      .resolves({})
      .on(PutPublicAccessBlockCommand, mockPutPublicAccessBlockCommandInput)
      .resolves({});
    await createAirnodeBucket(cloudProvider);

    expect(mockS3Client).toHaveReceivedCommandWith(CreateBucketCommand, mockCreateBucketCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(PutPublicAccessBlockCommand, mockPutPublicAccessBlockCommandInput);
  });

  it(`creates S3 Airnode bucket with options for other than 'us-east-1' region`, async () => {
    const mockCreateBucketCommandInputDifferentRegion = {
      Bucket: bucketName,
      CreateBucketConfiguration: { LocationConstraint: 'europe-central-1' },
    };
    mockS3Client
      .on(CreateBucketCommand, mockCreateBucketCommandInputDifferentRegion)
      .resolves({})
      .on(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput)
      .resolves({})
      .on(PutPublicAccessBlockCommand, mockPutPublicAccessBlockCommandInput)
      .resolves({});
    await createAirnodeBucket({ ...cloudProvider, region: 'europe-central-1' });

    expect(mockS3Client).toHaveReceivedCommandWith(CreateBucketCommand, mockCreateBucketCommandInputDifferentRegion);
    expect(mockS3Client).toHaveReceivedCommandWith(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(PutPublicAccessBlockCommand, mockPutPublicAccessBlockCommandInput);
  });

  it(`throws an error if can't create a bucket`, async () => {
    mockS3Client.on(CreateBucketCommand, mockCreateBucketCommandInput).rejects(s3Error);

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to create an S3 bucket: Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(CreateBucketCommand, mockCreateBucketCommandInput);
  });

  it(`throws an error if can't set encryption`, async () => {
    mockS3Client
      .on(CreateBucketCommand, mockCreateBucketCommandInput)
      .resolves({})
      .on(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput)
      .rejects(s3Error);

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to enable encryption for bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(CreateBucketCommand, mockCreateBucketCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput);
  });

  it(`throws an error if can't set public access`, async () => {
    mockS3Client
      .on(CreateBucketCommand, mockCreateBucketCommandInput)
      .resolves({})
      .on(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput)
      .resolves({})
      .on(PutPublicAccessBlockCommand, mockPutPublicAccessBlockCommandInput)
      .rejects(s3Error);

    await expect(createAirnodeBucket(cloudProvider)).rejects.toThrow(
      new Error(`Failed to setup a public access block for bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(CreateBucketCommand, mockCreateBucketCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(PutBucketEncryptionCommand, mockPutBucketEncryptionCommandInput);
    expect(mockS3Client).toHaveReceivedCommandWith(PutPublicAccessBlockCommand, mockPutPublicAccessBlockCommandInput);
  });
});

describe('getBucketDirectoryStructure', () => {
  const mockListObjectsV2CommandInput = { Bucket: bucketName };

  beforeEach(() => {
    mockS3Client.reset();
  });

  it('returns bucket directory structure', async () => {
    mockS3Client.on(ListObjectsV2Command, mockListObjectsV2CommandInput).resolves({
      Contents: mockBucketDirectoryStructureList.map((path) => ({ Key: path })),
      IsTruncated: false,
    });

    const directoryStructure = await getBucketDirectoryStructure(bucket);
    expect(directoryStructure).toEqual(mockBucketDirectoryStructure);
    expect(mockS3Client).toHaveReceivedCommandWith(ListObjectsV2Command, mockListObjectsV2CommandInput);
  });

  it(`throws an error if can't list bucket content`, async () => {
    mockS3Client.on(ListObjectsV2Command, mockListObjectsV2CommandInput).rejects(s3Error);

    await expect(getBucketDirectoryStructure(bucket)).rejects.toThrow(
      new Error(`Failed to list content of bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(ListObjectsV2Command, mockListObjectsV2CommandInput);
  });
});

describe('storeFileToBucket', () => {
  const mockPutObjectCommandInput = {
    Bucket: bucketName,
    Key: bucketFilePath,
    Body: fileContent,
  };

  beforeEach(() => {
    mockS3Client.reset();
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => fileContent);
  });

  it('stores file in S3 bucket', async () => {
    mockS3Client.on(PutObjectCommand, mockPutObjectCommandInput).resolves({});

    await storeFileToBucket(bucket, bucketFilePath, filePath);
    expect(mockS3Client).toHaveReceivedCommandWith(PutObjectCommand, mockPutObjectCommandInput);
  });

  it(`throws an error if can't store file in bucket`, async () => {
    mockS3Client.on(PutObjectCommand, mockPutObjectCommandInput).rejects(s3Error);

    await expect(storeFileToBucket(bucket, bucketFilePath, filePath)).rejects.toThrow(
      new Error(`Failed to store file '${filePath}' to S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(PutObjectCommand, mockPutObjectCommandInput);
  });
});

describe('getFileFromBucket', () => {
  const mockGetObjectCommandInput = { Bucket: bucketName, Key: bucketFilePath };
  const mockStream = new Readable();
  mockStream.push(fileContent);
  mockStream.push(null);
  const mockGetObjectCommandOutput = { Body: sdkStreamMixin(mockStream) };

  beforeEach(() => {
    mockS3Client.reset();
  });

  it('fetches file from S3 bucket', async () => {
    mockS3Client.on(GetObjectCommand, mockGetObjectCommandInput).resolves(mockGetObjectCommandOutput);

    const fetchedFileContent = await getFileFromBucket(bucket, bucketFilePath);
    expect(fetchedFileContent).toEqual(fileContent);
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, mockGetObjectCommandInput);
  });

  it(`throw an error if can't fetch file from bucket`, async () => {
    mockS3Client.on(GetObjectCommand, mockGetObjectCommandInput).rejects(s3Error);

    await expect(getFileFromBucket(bucket, bucketFilePath)).rejects.toThrow(
      new Error(`Failed to fetch file '${bucketFilePath}' from S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, mockGetObjectCommandInput);
  });
});

describe('copyFileInBucket', () => {
  const toBucketFilePath = '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662557994854/config.json';
  const mockCopyObjectCommandInput = {
    Bucket: bucketName,
    CopySource: `/${bucketName}/${bucketFilePath}`,
    Key: toBucketFilePath,
  };

  beforeEach(() => {
    mockS3Client.reset();
  });

  it('copies file within a bucket', async () => {
    mockS3Client.on(CopyObjectCommand, mockCopyObjectCommandInput).resolves({});

    await copyFileInBucket(bucket, bucketFilePath, toBucketFilePath);
    expect(mockS3Client).toHaveReceivedCommandWith(CopyObjectCommand, mockCopyObjectCommandInput);
  });

  it(`throw an error if can't copy file within bucket`, async () => {
    mockS3Client.on(CopyObjectCommand, mockCopyObjectCommandInput).rejects(s3Error);

    await expect(copyFileInBucket(bucket, bucketFilePath, toBucketFilePath)).rejects.toThrow(
      new Error(
        `Failed to copy file '${bucketFilePath}' to file '${toBucketFilePath}' within S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`
      )
    );
    expect(mockS3Client).toHaveReceivedCommandWith(CopyObjectCommand, mockCopyObjectCommandInput);
  });
});

describe('deleteObjects', () => {
  const bucketKeys = mockBucketDirectoryStructureList.filter((key) =>
    key.startsWith('0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace')
  );
  const mockDeleteObjectsCommandInput = {
    Bucket: bucketName,
    Delete: { Objects: bucketKeys.map((bucketKey) => ({ Key: bucketKey })) },
  };

  beforeEach(() => {
    mockS3Client.reset();
  });

  it('deletes S3 bucket directory and its content', async () => {
    mockS3Client.on(DeleteObjectsCommand, mockDeleteObjectsCommandInput).resolves({});

    await deleteBucketDirectory(
      bucket,
      mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory
    );
    expect(mockS3Client).toHaveReceivedCommandWith(DeleteObjectsCommand, mockDeleteObjectsCommandInput);
  });

  it(`throw an error if can't delete files from bucket`, async () => {
    mockS3Client.on(DeleteObjectsCommand, mockDeleteObjectsCommandInput).rejects(s3Error);

    await expect(
      deleteBucketDirectory(
        bucket,
        mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'] as Directory
      )
    ).rejects.toThrow(
      new Error(
        `Failed to delete bucket directory '${mockBucketDirectoryStructure['0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace'].bucketKey}' and its content: Error: ${s3ErrorMessage}`
      )
    );
    expect(mockS3Client).toHaveReceivedCommandWith(DeleteObjectsCommand, mockDeleteObjectsCommandInput);
  });
});

describe('deleteBucket', () => {
  const mockDeleteBucketCommandInput = { Bucket: bucketName };

  beforeEach(() => {
    mockS3Client.reset();
  });

  it('deletes an empty S3 bucket', async () => {
    mockS3Client.on(DeleteBucketCommand, mockDeleteBucketCommandInput).resolves({});

    await deleteBucket(bucket);
    expect(mockS3Client).toHaveReceivedCommandWith(DeleteBucketCommand, mockDeleteBucketCommandInput);
  });

  it(`throw an error if can't delete files from bucket`, async () => {
    mockS3Client.on(DeleteBucketCommand, mockDeleteBucketCommandInput).rejects(s3Error);

    await expect(deleteBucket(bucket)).rejects.toThrow(
      new Error(`Failed to delete S3 bucket '${bucketName}': Error: ${s3ErrorMessage}`)
    );
    expect(mockS3Client).toHaveReceivedCommandWith(DeleteBucketCommand, mockDeleteBucketCommandInput);
  });
});
