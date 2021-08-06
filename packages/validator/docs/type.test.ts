import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';
import { extraFieldMessage } from '../src/utils/messages';

it('type checking (docs)', () => {
  const template = {
    list: {
      __arrayItem: {
        item: {},
      },
    },
    str: {
      __type: 'string',
    },
    regex: {
      __regexp: '.*',
    },
    num: {
      __type: 'number',
    },
  };

  const validSpecs = {
    list: [
      {
        item: 'This is array',
      },
    ],
    str: 'This is string',
    regex: 'Also a string',
    num: 123,
  };

  const invalidSpecs = {
    list: {
      item: 'This is object',
    },
    str: 123,
    regex: {},
    num: '123',
  };

  expect(validator.validateJson(validSpecs, template)).toMatchObject({ valid: true, messages: [] });
  expect(validator.validateJson(invalidSpecs, template)).toMatchObject({
    valid: false,
    messages: [
      msg.typeMismatch(['list'], 'array'),
      msg.typeMismatch(['str'], 'string'),
      msg.typeMismatch(['regex'], 'string'),
      msg.typeMismatch(['num'], 'number'),
      extraFieldMessage(['list', 'item']),
    ],
  });
});
