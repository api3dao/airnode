import * as data from './fixtures/dynamic_params';
import * as validator from '../src/validator';

describe('dynamic params (docs)', () => {
  it('parameter path', () => {
    expect(validator.validateJson(data.keyValidSpecs, data.keyTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.keyInvalidSpecs, data.keyTemplate)).toEqual(data.keyInvalidOut);
  });

  it('parameter value', () => {
    expect(validator.validateJson(data.valueValidSpecs, data.valueTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.valueInvalidSpecs, data.valueTemplate)).toEqual(data.valueInvalidOut);
  });
});
