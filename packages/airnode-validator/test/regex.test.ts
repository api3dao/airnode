import * as data from './fixtures/regex';
import * as validator from '../src/validator';

it('regular expressions (docs)', () => {
  expect(validator.validateJson(data.validSpecs, data.template)).toEqual({ valid: true, messages: [] });
  expect(validator.validateJson(data.invalidSpecs, data.template)).toEqual(data.invalidOut);
});
