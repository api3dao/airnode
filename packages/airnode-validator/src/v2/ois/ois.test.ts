import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import cloneDeep from 'lodash/cloneDeep';
import { oisSchema, operationParameterSchema, endpointParameterSchema } from './ois';
import { SchemaType } from '../types';

const loadOisFixture = (): SchemaType<typeof oisSchema> =>
  // This OIS is guaranteed to be valid because there is a test for it's validity below
  JSON.parse(readFileSync(join(__dirname, '../../../exampleSpecs/ois.specs.json')).toString());

it('successfully parses OIS spec', () => {
  const ois = loadOisFixture();
  expect(() => oisSchema.parse(ois)).not.toThrow();
});

it('handles discriminated union error nicely', () => {
  const ois = loadOisFixture();
  delete (ois.apiSpecifications.components.securitySchemes.coinlayerSecurityScheme as any).name;

  expect(() => oisSchema.parse(ois)).toThrow(
    new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['apiSpecifications', 'components', 'securitySchemes', 'coinlayerSecurityScheme', 'name'],
        message: 'Required',
      },
    ])
  );
});

describe('disallows reserved parameter name', () => {
  it('in operation parameters', () => {
    expect(() => operationParameterSchema.parse({ in: 'header', name: '_type' })).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: '"_type" cannot be used because it is a name of a reserved parameter',
          path: ['name'],
        },
      ])
    );
  });

  it('in parameters', () => {
    expect(() =>
      endpointParameterSchema.parse({ name: 'param', operationParameter: { in: 'header', name: '_type' } })
    ).toThrow(
      new ZodError([
        {
          code: 'custom',
          message: '"_type" cannot be used because it is a name of a reserved parameter',
          path: ['operationParameter', 'name'],
        },
      ])
    );
  });
});

it('verifies that the same parameter cannot be in fixedOperationParameters and parameters', () => {
  const ois = loadOisFixture();
  ois.endpoints.push(cloneDeep(ois.endpoints[0]));

  // Create the same parameter in the first endpoint
  const parameter1 = { name: 'api-param-name1', in: 'query' } as const;
  ois.endpoints[0].parameters.push({ name: 'test-param', operationParameter: parameter1 });
  ois.endpoints[0].fixedOperationParameters.push({
    value: '123',
    operationParameter: parameter1,
  });

  // Create the same parameter in the second endpoint
  const parameter2 = { name: 'api-param-name2', in: 'query' } as const;
  ois.endpoints[1].parameters.push({ name: 'test-param2', operationParameter: parameter2 });
  ois.endpoints[1].fixedOperationParameters.push({
    value: '456',
    operationParameter: parameter2,
  });

  expect(() => oisSchema.parse(ois)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'Parameters "api-param-name1" are used in both "parameters" and "fixedOperationOperations"',
        path: ['ois', 'endpoints', 0],
      },
      {
        code: 'custom',
        message: 'Parameters "api-param-name2" are used in both "parameters" and "fixedOperationOperations"',
        path: ['ois', 'endpoints', 1],
      },
    ])
  );
});
