import * as data from './fixtures/template';
import * as validator from '../src/validator';

it('nested templates (docs)', () => {
  expect(validator.validateJson(data.validSpecs, data.template, 'test/')).toEqual({ valid: true, messages: [] });
  expect(validator.validateJson(data.invalidSpecs, data.template, 'test/')).toEqual(data.invalidOut);
});
