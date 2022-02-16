import { readFileSync } from 'fs';
import { join } from 'path';
import { oisSchema } from './index';

it('successfully parses OIS spec', () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../../exampleSpecs/ois.specs.json')).toString());
  expect(oisSchema.parse(ois)).not.toThrow();
});
