import * as data from './data/optional';
import * as validator from '../src/validator';

it('optional (docs)', () => {
  expect(validator.validateJson(data.validSpecs, data.template)).toEqual({ valid: true, messages: [] });
  expect(validator.validateJson(data.invalidSpecs, data.template)).toEqual(data.invalidOut);
});
