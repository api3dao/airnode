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
