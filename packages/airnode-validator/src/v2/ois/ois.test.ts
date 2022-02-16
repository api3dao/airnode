import { readFileSync } from 'fs';
import { join } from 'path';
import { ZodError } from 'zod';
import { oisSchema } from './ois';

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
