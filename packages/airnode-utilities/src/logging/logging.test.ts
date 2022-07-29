import cloneDeep from 'lodash/cloneDeep';
import { addMetadata, formatMetadata, getLogOptions, removeMetadata, setLogOptions } from './logging';
import { LogOptions } from './types';

describe('formatMetadata', () => {
  it('returns empty string for no metadata', () => {
    expect(formatMetadata({})).toEqual('');
  });

  it('formats metadata accordingly', () => {
    expect(
      formatMetadata({
        'Coordinator-ID': '123456',
        'Additional-info': 'abc',
      })
    ).toEqual('Coordinator-ID:123456, Additional-info:abc');
  });
});

describe('metadata', () => {
  const logOptions: LogOptions = {
    format: 'plain',
    level: 'DEBUG',
    meta: { Base: 'basic info', Another: 'abc' },
  };

  beforeEach(() => {
    setLogOptions(logOptions);
  });

  it('can extend and override metadata', () => {
    addMetadata({ 'new-meta': 'xyz', Another: 'abcdef' });

    expect(getLogOptions()).toEqual({
      format: 'plain',
      level: 'DEBUG',
      meta: {
        Another: 'abcdef',
        Base: 'basic info',
        'new-meta': 'xyz',
      },
    });
  });

  it('can remove metadata info', () => {
    removeMetadata(['Another']);

    expect(getLogOptions()).toEqual({
      format: 'plain',
      level: 'DEBUG',
      meta: {
        Base: 'basic info',
      },
    });
  });

  it('is immutable', () => {
    const initialLogOptions = getLogOptions();
    const initialLogOptionsClone = cloneDeep(initialLogOptions);

    addMetadata({ 'new-meta': 'xyz' });
    expect(initialLogOptions).toEqual(initialLogOptionsClone);

    removeMetadata(['new-meta']);
    expect(initialLogOptions).toEqual(initialLogOptionsClone);
  });
});
