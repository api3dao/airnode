import * as data from './data/catch';
import * as validator from '../src/validator';

describe('catch (docs)', () => {
  it('no catch', () => {
    expect(validator.validateJson(data.specs, data.noCatchTemplate)).toEqual(data.noCatchOut);
  });

  it('basic catch', () => {
    expect(validator.validateJson(data.specs, data.basicTemplate)).toEqual(data.basicOut);
  });

  it('modifying level', () => {
    expect(validator.validateJson(data.specs, data.levelTemplate)).toEqual(data.levelOut);
  });

  it('ignoring messages', () => {
    expect(validator.validateJson(data.specs, data.ignoreTemplate)).toEqual(data.ignoreOut);
  });

  it('special keywords', () => {
    expect(validator.validateJson(data.specs, data.keywordsTemplate)).toEqual(data.keywordsOut);
  });
});
