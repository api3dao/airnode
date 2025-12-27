import { readFileSync } from 'fs';
import { join } from 'path';
import { z, ZodError } from 'zod';
import { AirnodeWallet, airnodeWalletSchema, Deployment, deploymentSchema, receiptSchema } from './receipt';
import { version as packageVersion } from '../../package.json';

it('successfully parses receipt.json', () => {
  const receipt = JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/receipt.valid.json')).toString());
  expect(() => receiptSchema.parse(receipt)).not.toThrow();
});

it(`doesn't allow extraneous properties`, () => {
  const receipt = JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/receipt.valid.json')).toString());
  expect(() => receiptSchema.parse(receipt)).not.toThrow();

  const invalidReceipt = { ...receipt, unknownProp: 'someValue' };
  expect(() => receiptSchema.parse(invalidReceipt)).toThrow(
    new ZodError([
      {
        code: 'unrecognized_keys',
        keys: ['unknownProp'],
        path: [],
        message: `Unrecognized key: "unknownProp"`,
      },
    ])
  );
});

describe('airnodeWalletSchema', () => {
  const airnodeWallet: AirnodeWallet = {
    airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
    airnodeXpub:
      'xpub6C8tvRgYkjNVaGMtpyZf4deBcUQHf7vgWUraVxY6gYiZhBYbPkFkLLWJzUUeVFdkKpVtatmXHX8kB76xgfmTpVZWbVWdq1rneaAY6a8RtbY',
  };

  it(`doesn't allow invalid Airnode address`, () => {
    expect(() => airnodeWalletSchema.parse(airnodeWallet)).not.toThrow();

    const invalidAirnodeWallet = { ...airnodeWallet, airnodeAddress: 'not-a-valid-address' };
    expect(() => airnodeWalletSchema.parse(invalidAirnodeWallet)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: 'Airnode address is not a valid address',
          path: ['airnodeAddress'],
        },
      ])
    );
  });
});

describe('deploymentSchema', () => {
  const deployment: Deployment = {
    deploymentId: 'awsac0247de',
    cloudProvider: {
      type: 'aws',
      region: 'us-east-1',
      disableConcurrencyReservations: false,
    },
    stage: 'starter-example',
    nodeVersion: packageVersion,
    timestamp: '2022-05-18T06:37:35.507Z',
  };

  it('must match package version', () => {
    expect(() => deploymentSchema.parse(deployment)).not.toThrow();

    const invalidDeployment = { ...deployment, nodeVersion: '0.4.0' };
    expect(() => deploymentSchema.parse(invalidDeployment)).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: `The "nodeVersion" must be ${packageVersion}`,
          path: ['nodeVersion'],
        },
      ])
    );
  });

  it(`doesn't allow stage in a wrong format`, () => {
    expect(() => deploymentSchema.parse(deployment)).not.toThrow();

    const invalidDeployment01 = { ...deployment, stage: 'stagenamewaytoolong' };
    expect(() => deploymentSchema.parse(invalidDeployment01)).toThrow(
      new ZodError([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'regex',
          pattern: '/^[a-z0-9-]{1,16}$/',
          path: ['stage'],
          message: 'Invalid string: must match pattern /^[a-z0-9-]{1,16}$/',
        } as z.core.$ZodIssueInvalidStringFormat,
      ])
    );

    const invalidDeployment02 = { ...deployment, stage: 'STAGE%^&*' };
    expect(() => deploymentSchema.parse(invalidDeployment02)).toThrow(
      new ZodError([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'regex',
          pattern: '/^[a-z0-9-]{1,16}$/',
          path: ['stage'],
          message: 'Invalid string: must match pattern /^[a-z0-9-]{1,16}$/',
        } as z.core.$ZodIssueInvalidStringFormat,
      ])
    );
  });

  it(`doesn't allow timestamp in a wrong format`, () => {
    expect(() => deploymentSchema.parse(deployment)).not.toThrow();

    const invalidDeployment = { ...deployment, timestamp: 'invalid_timestamp' };
    expect(() => deploymentSchema.parse(invalidDeployment)).toThrow(
      new ZodError([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'regex',
          pattern:
            '/^(\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+([+-][0-2]\\d:[0-5]\\d|Z))|(\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d([+-][0-2]\\d:[0-5]\\d|Z))|(\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d([+-][0-2]\\d:[0-5]\\d|Z))$/',
          path: ['timestamp'],
          message:
            'Invalid string: must match pattern /^(\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+([+-][0-2]\\d:[0-5]\\d|Z))|(\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d([+-][0-2]\\d:[0-5]\\d|Z))|(\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d([+-][0-2]\\d:[0-5]\\d|Z))$/',
        } as z.core.$ZodIssueInvalidStringFormat,
      ])
    );
  });

  it(`doesn't allow deployment ID in a wrong format`, () => {
    expect(() => deploymentSchema.parse(deployment)).not.toThrow();

    const invalidDeployment = { ...deployment, deploymentId: 'invalid_deployment_id' };
    expect(() => deploymentSchema.parse(invalidDeployment)).toThrow(
      new ZodError([
        {
          origin: 'string',
          code: 'invalid_format',
          format: 'regex',
          pattern: '/(aws|gcp)[a-f0-9]{8}/',
          path: ['deploymentId'],
          message: 'Invalid string: must match pattern /(aws|gcp)[a-f0-9]{8}/',
        } as z.core.$ZodIssueInvalidStringFormat,
      ])
    );
  });
});
