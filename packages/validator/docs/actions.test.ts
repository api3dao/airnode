import * as data from './data/actions';
import * as convertor from '../src/convertor';

describe('actions (docs)', () => {
  it('copy action', () => {
    expect(convertor.convertJson(data.copySpecs, data.copyTemplate)).toEqual(data.copyOut);
  });

  it('insert action', () => {
    expect(convertor.convertJson(data.insertSpecs, data.insertTemplate)).toEqual(data.insertOut);
  });

  it('arrays', () => {
    expect(convertor.convertJson(data.arraysSpecs, data.arraysTemplate)).toEqual(data.arraysOut);
  });

  it('all', () => {
    expect(convertor.convertJson(data.allSpecs, data.allTemplate)).toEqual(data.allOut);
  });
});
