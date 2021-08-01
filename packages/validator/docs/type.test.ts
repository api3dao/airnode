import * as data from './data/type';
import * as validator from '../src/validator';

it('type checking (docs)', () => {
  expect(validator.validateJson(data.validSpecs, data.template)).toMatchObject({ valid: true, messages: [] });
  expect(validator.validateJson(data.invalidSpecs, data.template)).toMatchObject(data.invalidOut);
});
