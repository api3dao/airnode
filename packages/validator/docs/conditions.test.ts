import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

describe('conditions (docs)', () => {
  it('basic condition', () => {
    const template = {
      numbers: {
        __arrayItem: {
          value: {},
          description: {},
          __conditions: [
            {
              __if: {
                value: '^one$',
              },
              __then: {
                description: {
                  __regexp: '^This is required by one$',
                  __catch: {
                    __level: 'error',
                  },
                },
              },
            },
            {
              __if: {
                value: '^two$',
              },
              __then: {
                description: {
                  __regexp: '^This is required by two$',
                  __catch: {
                    __level: 'error',
                  },
                },
              },
            },
          ],
        },
      },
    };

    const validSpecs = {
      numbers: [
        {
          value: 'one',
          description: 'This is required by one',
        },
        {
          value: 'two',
          description: 'This is required by two',
        },
        {
          value: 'three',
          description: 'No requirement for three',
        },
      ],
    };

    const invalidSpecs = {
      numbers: [
        {
          value: 'one',
          description: 'No requirement for one',
        },
        {
          value: 'two',
          description: 'This is required by one',
        },
      ],
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.conditionNotMetMessage(['numbers[0]', 'value'], 'value'),
        msg.conditionNotMetMessage(['numbers[1]', 'value'], 'value'),
      ],
    });
  });

  it('condition with match', () => {
    const template = {
      numbers: {
        __arrayItem: {
          value: {},
          description: {
            __objectItem: {},
          },
          __conditions: [
            {
              __if: {
                value: '.*',
              },
              __then: {
                description: {
                  __match: {
                    __regexp: '^This is required by __match$',
                    __catch: {
                      __level: 'error',
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };

    const validSpecs = {
      numbers: [
        {
          value: 'one',
          description: {
            one: 'This is required by one',
          },
        },
        {
          value: 'two',
          description: {
            two: 'This is required by two',
          },
        },
      ],
    };

    const invalidSpecs = {
      numbers: [
        {
          value: 'one',
          description: {
            one: 'This is required by two',
          },
        },
        {
          value: 'two',
          description: {
            two: 'This is required by three',
          },
        },
      ],
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.conditionNotMetMessage(['numbers[0]', 'value'], 'value'),
        msg.conditionNotMetMessage(['numbers[1]', 'value'], 'value'),
      ],
    });
  });

  it('condition with catch', () => {
    const template = {
      numbers: {
        __arrayItem: {
          value: {},
          description: {},
          __conditions: [
            {
              __if: {
                value: '^one$',
              },
              __then: {
                description: {
                  __regexp: '^This is required by one$',
                  __catch: {
                    __level: 'error',
                  },
                },
              },
              __catch: {
                __message: "__fullPath only allowed value is: 'This is required by one'",
              },
            },
            {
              __if: {
                value: '^two$',
              },
              __then: {
                description: {
                  __regexp: '^This is required by two$',
                  __catch: {
                    __level: 'error',
                  },
                },
              },
              __catch: {
                __message: "__fullPath only allowed value is: 'This is required by two'",
              },
            },
          ],
        },
      },
    };

    const specs = {
      numbers: [
        {
          value: 'one',
          description: 'No requirement for one',
        },
        {
          value: 'two',
          description: 'This is required by one',
        },
      ],
    };

    expect(validator.validateJson(specs, template)).toEqual({
      valid: false,
      messages: [
        { level: 'error', message: "numbers[0].value only allowed value is: 'This is required by one'" },
        { level: 'error', message: "numbers[1].value only allowed value is: 'This is required by two'" },
      ],
    });
  });

  it('root then', () => {
    const template = {
      itemsList: {
        __arrayItem: {
          name: {},
          __conditions: [
            {
              __if: {
                name: '.*',
              },
              __rootThen: {
                items: {
                  __match: {},
                },
              },
            },
          ],
        },
      },
      items: {
        __objectItem: {},
      },
    };

    const validSpecs = {
      itemsList: [
        {
          name: 'item0',
        },
        {
          name: 'item1',
        },
      ],
      items: {
        item0: {},
        item1: {},
      },
    };

    const invalidSpecs = {
      itemsList: [
        {
          name: 'item0',
        },
        {
          name: 'item1',
        },
      ],
      items: {
        item1: {},
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [msg.conditionNotMetMessage(['itemsList[0]', 'name'], 'name')],
    });
  });

  it('__this and __this_name', () => {
    const template = {
      original: {
        version: {
          __conditions: [
            {
              __if: {
                __this: '.*',
              },
              __rootThen: {
                backup: {
                  version: {
                    __regexp: '^__match$',
                    __catch: {
                      __level: 'error',
                    },
                  },
                },
              },
            },
          ],
        },
        __objectItem: {},
        __conditions: [
          {
            __if: {
              __this_name: '.*',
            },
            __rootThen: {
              backup: {
                __match: {},
              },
            },
          },
        ],
      },
      backup: {
        __objectItem: {},
      },
    };

    const validSpecs = {
      original: {
        version: '1.0.2',
        item0: 'abc',
        item1: 'def',
        item2: 'ghi',
      },
      backup: {
        version: '1.0.2',
        item0: 'abc',
        item1: 'def',
        item2: 'ghi',
      },
    };

    const invalidSpecs = {
      original: {
        version: '1.0.2',
        item0: 'abc',
        item1: 'def',
        item2: 'ghi',
      },
      backup: {
        version: '1.0.0',
        item: 'abc',
        item1: 'def',
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.conditionNotMetMessage(['original', 'version'], 'version'),
        msg.conditionNotMetMessage(['original', 'item0'], 'item0'),
        msg.conditionNotMetMessage(['original', 'item2'], 'item2'),
      ],
    });
  });
});
