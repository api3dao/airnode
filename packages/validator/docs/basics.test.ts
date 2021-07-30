import * as data from './data/basics';
import * as validator from '../src/validator';

describe('basics (docs)', () => {
  it('basic', () => {
    expect(validator.validateJson(data.validSpecs, data.template)).toEqual(data.validOut);
    expect(validator.validateJson(data.invalidSpecs, data.template)).toEqual(data.invalidOut);
  });

  it('object item', () => {
    expect(validator.validateJson(data.objValidSpecs, data.objTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.objInvalidSpecs, data.objTemplate)).toEqual(data.objInvalidOut);
  });

  it('array item', () => {
    expect(validator.validateJson(data.arrayValidSpecs, data.arrayTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.arrayInvalidSpecs, data.arrayTemplate)).toEqual(data.arrayInvalidOut);
  });
});
