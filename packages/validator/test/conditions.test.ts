import * as data from './fixtures/conditions';
import * as validator from '../src/validator';

describe('conditions (docs)', () => {
  it('basic condition', () => {
    expect(validator.validateJson(data.basicValidSpecs, data.basicTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.basicInvalidSpecs, data.basicTemplate)).toEqual(data.basicInvalidOut);
  });

  it('condition with match', () => {
    expect(validator.validateJson(data.matchValidSpecs, data.matchTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.matchInvalidSpecs, data.matchTemplate)).toEqual(data.matchInvalidOut);
  });

  it('condition with catch', () => {
    expect(validator.validateJson(data.catchInvalidSpecs, data.catchTemplate)).toEqual(data.catchInvalidOut);
  });

  it('root then', () => {
    expect(validator.validateJson(data.rootValidSpecs, data.rootTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.rootInvalidSpecs, data.rootTemplate)).toEqual(data.rootInvalidOut);
  });

  it('__this and __this_name', () => {
    expect(validator.validateJson(data.thisValidSpecs, data.thisTemplate)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(data.thisInvalidSpecs, data.thisTemplate)).toEqual(data.thisInvalidOut);
  });
});
