import { readFileSync } from 'fs';
import { join } from 'path';
import { receiptSchema } from './receipt';

it('successfully parses receipt.json', () => {
  const ois = JSON.parse(readFileSync(join(__dirname, '../../test/fixtures/receipt.valid.json')).toString());
  expect(() => receiptSchema.parse(ois)).not.toThrow();
});
