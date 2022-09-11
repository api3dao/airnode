import { DirectoryStructure, FileSystemType } from '../../src/utils/infrastructure';

export const mockBucketDirectoryStructureList = [
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/config.json',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/config.json',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/config.json',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/secrets.env',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/default.tfstate',
  '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/config.json',
  '0x04783518D380B704978Ed7f560d952fe4EdDd196/',
  '0x04783518D380B704978Ed7f560d952fe4EdDd196/prod/',
  '0xfb87102cdabadf905321521ba0b3cbf74ad09c5d/',
  '0xdCb725091c67fC9f0fB78Bb2BB86d8d2DAC12C5a',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/secrets.env',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/default.tfstate',
  '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/config.json',
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
          '1662557983': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557983/config.json',
                type: FileSystemType.File,
              },
            },
          },
          '1662558010': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662558010/config.json',
                type: FileSystemType.File,
              },
            },
          },
          '1662557994': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/dev/1662557994/config.json',
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
          '1662558071': {
            bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xd0624E6C2C8A1DaEdE9Fa7E9C409167ed5F256c6/prod/1662558071/config.json',
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
          '1662559204': {
            bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/',
            type: FileSystemType.Directory,
            children: {
              'secrets.env': {
                bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/secrets.env',
                type: FileSystemType.File,
              },
              'default.tfstate': {
                bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/default.tfstate',
                type: FileSystemType.File,
              },
              'config.json': {
                bucketKey: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace/dev/1662559204/config.json',
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
