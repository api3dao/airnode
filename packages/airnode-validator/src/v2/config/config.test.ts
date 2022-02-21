import { readFileSync } from 'fs';
import { join } from 'path';
import { configSchema } from './config';

it('successfully parses config.json specs', () => {
  const ois = JSON.parse(
    readFileSync(join(__dirname, '../../../exampleSpecs/interpolated-config.specs.json')).toString()
  );
  expect(() => configSchema.parse(ois)).not.toThrow();
});
