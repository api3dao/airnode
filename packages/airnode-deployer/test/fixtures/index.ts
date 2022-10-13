import { Deployment } from '../../src/infrastructure';
import { DirectoryStructure, FileSystemType } from '../../src/utils/infrastructure';

export const mockBucketDirectoryStructureList = [
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/config.json',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/config.json',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/config.json',
  '0x04783518D380B704978Ed7f560d952fe4EdDd196/',
  '0x04783518D380B704978Ed7f560d952fe4EdDd196/prod/',
  '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d/',
  '0xdCb725091c67fC9f0fB78Bb2BB86d8d2DAC12C5a',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/secrets.env',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/default.tfstate',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json',
  '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/',
  '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/devFile',
  '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/devEmpty/',
];
export const mockBucketDirectoryStructure = {
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6': {
    bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/',
    type: FileSystemType.Directory,
    children: {
      dev: {
        bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/',
        type: FileSystemType.Directory,
        children: {
          '1662557983568': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983568/config.json',
                type: FileSystemType.File,
              },
            },
          },
          '1662558010204': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010204/config.json',
                type: FileSystemType.File,
              },
            },
          },
          '1662557994854': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994854/config.json',
                type: FileSystemType.File,
              },
            },
          },
        },
      },
      prod: {
        bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/',
        type: FileSystemType.Directory,
        children: {
          '1662558071950': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071950/config.json',
                type: FileSystemType.File,
              },
            },
          },
        },
      },
    },
  },
  '0x04783518D380B704978Ed7f560d952fe4EdDd196': {
    bucketKey: '0x04783518D380B704978Ed7f560d952fe4EdDd196/',
    type: FileSystemType.Directory,
    children: {
      prod: {
        bucketKey: '0x04783518D380B704978Ed7f560d952fe4EdDd196/prod/',
        type: FileSystemType.Directory,
        children: {},
      },
    },
  },
  '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d': {
    bucketKey: '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d/',
    type: FileSystemType.Directory,
    children: {},
  },
  '0xdCb725091c67fC9f0fB78Bb2BB86d8d2DAC12C5a': {
    bucketKey: '0xdCb725091c67fC9f0fB78Bb2BB86d8d2DAC12C5a',
    type: FileSystemType.File,
  },
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace': {
    bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/',
    type: FileSystemType.Directory,
    children: {
      dev: {
        bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/',
        type: FileSystemType.Directory,
        children: {
          '1662559204554': {
            bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204554/config.json',
                type: FileSystemType.File,
              },
            },
          },
        },
      },
    },
  },
  '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043': {
    bucketKey: '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/',
    type: FileSystemType.Directory,
    children: {
      devFile: {
        bucketKey: '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/devFile',
        type: FileSystemType.File,
      },
      devEmpty: {
        bucketKey: '0x04f6CAACE10b89d23Ad0ce0B2ceDb6DF8d2Ec043/devEmpty/',
        type: FileSystemType.Directory,
        children: {},
      },
    },
  },
} as DirectoryStructure;

export const mockDeployments: Deployment[] = [
  {
    id: 'aws0e53f7fa',
    cloudProvider: {
      type: 'aws',
      region: 'us-east-1',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0x13D845DB99F9b822f881cBCB330fEa8bC46e09Ea',
    stage: 'prod',
    airnodeVersion: '1.8.0',
    lastUpdate: '1662558071950',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0x13D845DB99F9b822f881cBCB330fEa8bC46e09Ea/dev/1662558071950',
  },
  {
    id: 'awsf071f45c',
    cloudProvider: {
      type: 'aws',
      region: 'us-east-1',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0x8196a4942F445837E8F388679daaf9fF65fe82Bd',
    stage: 'testing',
    airnodeVersion: '0.0.10',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0x8196a4942F445837E8F388679daaf9fF65fe82Bd/dev/1662559204554',
  },
  {
    id: 'awsf8d3e707',
    cloudProvider: {
      type: 'aws',
      region: 'us-east-1',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0xE52b9e9d07A04495ACdded0aC8b666e37fe22d53',
    stage: 'dev',
    airnodeVersion: '0.0.10',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0xE52b9e9d07A04495ACdded0aC8b666e37fe22d53/dev/1662559204554',
  },
  {
    id: 'awsbf45d5a8',
    cloudProvider: {
      type: 'aws',
      region: 'us-east-1',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0xE52b9e9d07A04495ACdded0aC8b666e37fe22d53',
    stage: 'testing',
    airnodeVersion: '0.0.5',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0xE52b9e9d07A04495ACdded0aC8b666e37fe22d53/dev/1662559204554',
  },
  {
    id: 'awsd1f89c33',
    cloudProvider: {
      type: 'aws',
      region: 'us-east-1',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0xE52b9e9d07A04495ACdded0aC8b666e37fe22d53',
    stage: 'testing',
    airnodeVersion: '0.0.10',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0xE52b9e9d07A04495ACdded0aC8b666e37fe22d53/dev/1662559204554',
  },
  {
    id: 'aws586f79c8',
    cloudProvider: {
      type: 'aws',
      region: 'us-west-1',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0xd47303274Bb3dB7BE61fc9cfDEFfaFE3D69274f1',
    stage: 'prod',
    airnodeVersion: '0.1.0',
    lastUpdate: '1662557983568',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0xd47303274Bb3dB7BE61fc9cfDEFfaFE3D69274f1/dev/1662557983568',
  },
  {
    id: 'gcp1afbe4ce',
    cloudProvider: {
      type: 'gcp',
      region: 'us-east1',
      projectId: 'airnode-0000',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0xd47303274Bb3dB7BE61fc9cfDEFfaFE3D69274f1',
    stage: 'dev',
    airnodeVersion: '0.1.0',
    lastUpdate: '1662558010204',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0xd47303274Bb3dB7BE61fc9cfDEFfaFE3D69274f1/dev/1662558010204',
  },
  {
    id: 'gcp9953c806',
    cloudProvider: {
      type: 'gcp',
      region: 'us-east1',
      projectId: 'airnode-123',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0x871BbaFb5e1b1A03Ed3B74620D88ED9c13366462',
    stage: 'dev',
    airnodeVersion: '0.8.12',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0x871BbaFb5e1b1A03Ed3B74620D88ED9c13366462/dev/1662559204554',
  },
  {
    id: 'gcp0bf360ff',
    cloudProvider: {
      type: 'gcp',
      region: 'eu-central1',
      projectId: 'airnode-1234',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0x13D845DB99F9b822f881cBCB330fEa8bC46e09Ea',
    stage: 'dev',
    airnodeVersion: '3.8.8',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0x13D845DB99F9b822f881cBCB330fEa8bC46e09Ea/dev/1662559204554',
  },
  {
    id: 'gcp278f550d',
    cloudProvider: {
      type: 'gcp',
      region: 'us-west1',
      projectId: 'airnode-1234',
      disableConcurrencyReservations: false,
    },
    airnodeAddress: '0x39BFa8d76928de1e3d17eB477fA04982BD9d4292',
    stage: 'test',
    airnodeVersion: '0.10.0',
    lastUpdate: '1662559204554',
    versions: [],
    bucket: {
      name: 'airnode-4fcaf94d160f',
      region: 'us-east-1',
    },
    bucketLatestDeploymentPath: '0x39BFa8d76928de1e3d17eB477fA04982BD9d4292/dev/1662559204554',
  },
];
