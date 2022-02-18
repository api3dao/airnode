import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { oisSchema, operationParameterSchema, endpointParameterSchema } from './ois';

it('successfully parses OIS spec', () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../../exampleSpecs/ois.specs.json')).toString());
  expect(() => oisSchema.parse(ois)).not.toThrow();
});

it('handles discriminated union error nicely', () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../../exampleSpecs/ois.specs.json')).toString());
  delete ois.apiSpecifications.components.securitySchemes.coinlayerSecurityScheme.name;

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
