import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

it('optional (docs)', () => {
  const template = {
    __optional: {
      optionalExample: {
        __regexp: 'optional',
      },
      outer: {
        inner: {},
      },
    },
  };

  const validSpecs = {
    optionalExample: 'This is optional',
  };

  const invalidSpecs = {
    optionalExample: 'test',
    outer: {},
  };

  expect(validator.validateJson(validSpecs, template)).toMatchObject({ valid: true, messages: [] });
  expect(validator.validateJson(invalidSpecs, template)).toMatchObject({
    valid: false,
    messages: [msg.formattingMessage(['optionalExample']), msg.missingParamMessage(['outer', 'inner'])],
  });
});
