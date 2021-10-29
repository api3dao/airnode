import * as data from './fixtures/any';
import * as validator from '../src/validator';

describe('any (docs)', () => {
  it('regular __any', () => {
    expect(validator.validateJson(data.validSpecs, data.template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.invalidSpecs, data.template)).toEqual(data.invalidOut);
  });

  it('any in conditions', () => {
    expect(validator.validateJson(data.conditionValidSpecs, data.conditionTemplate)).toEqual({
      valid: true,
      messages: [],
    });
    expect(validator.validateJson(data.conditionInvalidSpecs, data.conditionTemplate)).toEqual(
      data.conditionInvalidOut
    );
  });
});
