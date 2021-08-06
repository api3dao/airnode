import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

describe('dynamic params (docs)', () => {
  it('parameter path', () => {
    const template = {
      __objectItem: {
        __keyRegexp: '^{{0}}[0-9]+$',
        __objectItem: {
          name: {
            __regexp: '^{{1}}$',
          },
        },
      },
    };

    const validSpecs = {
      bus: {
        bus1: {
          name: 'bus1',
        },
        bus2: {
          name: 'bus2',
        },
      },
      plane: {
        plane1: {
          name: 'plane1',
        },
      },
    };

    const invalidSpecs = {
      bus: {
        plane1: {
          name: 'plane1',
        },
        bus2: {
          name: 'bus1',
        },
      },
      plane: {
        plane1: {
          name: 'bus1',
        },
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [
        msg.keyFormattingMessage('plane1', ['bus', 'plane1']),
        msg.formattingMessage(['bus', 'bus2', 'name']),
        msg.formattingMessage(['plane', 'plane1', 'name']),
      ],
    });
  });

  it('parameter value', () => {
    const template = {
      bus: {
        __arrayItem: {
          details: {
            doors: {
              __regexp: '[0-9]+',
            },
            wheels: {
              __regexp: '[0-9]+',
            },
          },
          owner: {
            __regexp: "^[[ '/', 'company', 'name' ]]$",
          },
          name: {},
          __conditions: [
            {
              __if: {
                name: '.*',
              },
              __then: {
                name: {
                  __regexp: "[[ 'details', 'wheels' ]]",
                  __catch: {
                    __level: 'error',
                  },
                },
              },
            },
          ],
        },
      },
      company: {
        name: {},
      },
    };

    const validSpecs = {
      bus: [
        {
          details: {
            doors: '3',
            wheels: '6',
          },
          name: '6-wheeler',
          owner: 'anon',
        },
        {
          details: {
            doors: '4',
            wheels: '8',
          },
          name: '8-wheeler',
          owner: 'anon',
        },
      ],
      company: {
        name: 'anon',
      },
    };

    const invalidSpecs = {
      bus: [
        {
          details: {
            doors: '3',
            wheels: '6',
          },
          name: '8-wheeler',
          owner: 'anon',
        },
        {
          details: {
            doors: '4',
            wheels: '8',
          },
          name: '8-wheeler',
          owner: 'anonymous',
        },
      ],
      company: {
        name: 'anon',
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [msg.conditionNotMetMessage(['bus[0]', 'name'], 'name'), msg.formattingMessage(['bus[1]', 'owner'])],
    });
  });
});
