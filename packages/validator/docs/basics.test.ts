import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

describe('basics (docs)', () => {
  it('basic', () => {
    const template = {
      server: {
        url: {},
      },
      component: {
        securityScheme: {
          in: {},
          name: {},
          type: {},
        },
      },
    };

    const validSpecs = {
      component: {
        securityScheme: {
          in: 'query',
          name: 'example',
          type: {},
        },
      },
      server: {
        url: 'https://just.example.com',
      },
    };

    const invalidSpecs = {
      server: {
        extra: {},
      },
      component: {},
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.missingParamMessage(['server', 'url']),
        msg.missingParamMessage(['component', 'securityScheme']),
        msg.extraFieldMessage(['server', 'extra']),
      ],
    });
  });

  it('object item', () => {
    const template = {
      __objectItem: {
        name: {},
      },
    };

    const validSpecs = {
      any: {
        name: 'val',
      },
      key: {
        name: 'val',
      },
    };

    const invalidSpecs = {
      invalid: {
        value: 'val',
      },
      specification: {},
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.missingParamMessage(['invalid', 'name']),
        msg.missingParamMessage(['specification', 'name']),
        msg.extraFieldMessage(['invalid', 'value']),
      ],
    });
  });

  it('array item', () => {
    const template = {
      arrayParameter: {
        __maxSize: 2,
        __arrayItem: {
          outer: {
            inner: {},
          },
        },
      },
      moreArrays: {
        __objectItem: {
          __arrayItem: {
            value: {},
          },
        },
      },
    };

    const validSpecs = {
      arrayParameter: [
        {
          outer: {
            inner: 'value1',
          },
        },
        {
          outer: {
            inner: 'value2',
          },
        },
      ],
      moreArrays: {
        array1: [
          {
            value: 'value',
          },
        ],
        array2: [],
      },
    };

    const invalidSpecs = {
      arrayParameter: [
        {
          outer: {
            inner: 'value1',
          },
        },
        {
          outer: {
            inner: 'value2',
          },
        },
        {
          outer: {},
        },
      ],
      moreArrays: {
        array1: [
          {
            invalid: 'value',
          },
        ],
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.sizeExceededMessage(['arrayParameter'], 2),
        msg.missingParamMessage(['arrayParameter[2]', 'outer', 'inner']),
        msg.missingParamMessage(['moreArrays', 'array1[0]', 'value']),
        msg.extraFieldMessage(['moreArrays', 'array1[0]', 'invalid']),
      ],
    });
  });
});
