import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

it('regular expressions (docs)', () => {
  const template = {
    string: {
      __regexp: '^(string|char)$',
    },
    numbers: {
      __keyRegexp: '^[0-9]+$',
      __objectItem: {
        __regexp: '^\\\\[a-z]+\\s$',
      },
    },
  };

  const validSpecs = {
    string: 'string',
    numbers: {
      '3': '\\three ',
      '10': '\\ten ',
      '42': '\\yes ',
    },
  };

  const invalidSpecs = {
    string: 'boolean',
    numbers: {
      string: '\\NaN ',
      '5': 'five ',
      '1': '\\one',
    },
  };

  expect(validator.validateJson(validSpecs, template)).toMatchObject({ valid: true, messages: [] });
  expect(validator.validateJson(invalidSpecs, template)).toMatchObject({
    valid: false,
    messages: [
      msg.formattingMessage(['string']),
      msg.keyFormattingMessage('string', ['numbers.string']),
      msg.formattingMessage(['numbers.1']),
      msg.formattingMessage(['numbers.5']),
      msg.formattingMessage(['numbers.string']),
    ],
  });
});
