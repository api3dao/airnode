import { readFileSync } from 'fs';
import { join } from 'path';
import { receiptSchema } from './receipt';

it('successfully parses receipt.json specs', () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../../exampleSpecs/receipt.specs.json')).toString());
  expect(() => receiptSchema.parse(ois)).not.toThrow();
});
