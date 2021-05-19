import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

describe('catch (docs)', () => {
  const specs = {
    test1: {
      title: 'Test 1',
      value: '1',
    },
    test2: {
      name: 'Test 2',
      value: 'two',
    },
    example3: {
      name: 'Test 3',
      value: '3',
    },
  };

  it('no catch', () => {
    const template = {
      __keyRegexp: '^test',
      __objectItem: {
        name: {},
        value: {
          __regexp: '^[0-9]$',
        },
      },
    };

    expect(validator.validateJson(specs, template)).toMatchObject({
      valid: false,
      messages: [
        msg.keyFormattingMessage('example3', ['example3']),
        msg.missingParamMessage(['test1', 'name']),
        msg.formattingMessage(['test2', 'value']),
        msg.extraFieldMessage(['test1', 'title']),
      ],
    });
  });

  it('basic catch', () => {
    const template = {
      __keyRegexp: '^test',
      __catch: {
        __level: 'error',
        __message: 'Please write better specification',
      },
      __objectItem: {
        name: {},
        value: {
          __regexp: '^[0-9]$',
        },
      },
    };

    expect(validator.validateJson(specs, template)).toMatchObject({
      valid: false,
      messages: [{ level: 'error', message: 'Please write better specification' }],
    });
  });

  it('modifying level', () => {
    const template = {
      __keyRegexp: '^test',
      __catch: {
        __level: 'warning',
      },
      __objectItem: {
        name: {},
        value: {
          __regexp: '^[0-9]$',
        },
      },
    };

    expect(validator.validateJson(specs, template)).toMatchObject({
      valid: true,
      messages: [
        { level: 'warning', message: 'Key example3 in example3 is formatted incorrectly' },
        { level: 'warning', message: 'Missing parameter test1.name' },
        msg.formattingMessage(['test2', 'value']),
        msg.extraFieldMessage(['test1', 'title']),
      ],
    });
  });

  it('ignoring messages', () => {
    const template = {
      __keyRegexp: '^test',
      __catch: {},
      __objectItem: {
        name: {},
        value: {
          __regexp: '^[0-9]$',
        },
      },
    };

    expect(validator.validateJson(specs, template)).toMatchObject({ valid: true, messages: [] });
  });
});
