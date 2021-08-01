import * as data from './data/template';
import * as validator from '../src/validator';

it('nested templates (docs)', () => {
  expect(validator.validateJson(data.validSpecs, data.template, 'docs/')).toEqual({ valid: true, messages: [] });
  expect(validator.validateJson(data.invalidSpecs, data.template, 'docs/')).toEqual(data.invalidOut);
});
