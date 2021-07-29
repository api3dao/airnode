import * as validator from '../src/validator';
import * as msg from '../src/utils/messages';

describe('any (docs)', () => {
  it('regular __any', () => {
    const template = {
      vehicles: {
        __arrayItem: {
          name: {},
          location: {},
        },
        __any: {
          name: {
            __regexp: 'plane',
          },
        },
      },
      buildings: {
        __objectItem: {
          name: {},
          location: {},
        },
        __any: {
          location: {
            __regexp: 'Malta',
          },
        },
      },
    };

    const validSpecs = {
      vehicles: [
        {
          name: 'bus',
          location: 'Albania',
        },
        {
          name: 'plane',
          location: 'Liechtenstein',
        },
        {
          name: 'plane',
          location: 'Estonia',
        },
      ],
      buildings: {
        cabin: {
          name: 'woodland',
          location: 'woods',
        },
        hotel: {
          name: 'five star',
          location: 'Malta',
        },
      },
    };

    const invalidSpecs = {
      vehicles: [
        {
          name: 'bus',
          location: 'Albania',
        },
        {
          name: 'boat',
          location: 'Liechtenstein',
        },
      ],
      buildings: {
        cabin: {
          name: 'woodland',
          location: 'woods',
        },
        hotel: {
          name: 'five star',
          location: 'Cyprus',
        },
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [msg.requiredConditionNotMetMessage(['vehicles']), msg.requiredConditionNotMetMessage(['buildings'])],
    });
  });

  it('any in conditions', () => {
    const template = {
      vehicles: {
        __arrayItem: {
          name: {},
          location: {},
          __conditions: [
            {
              __if: {
                location: '.*',
              },
              __rootThen: {
                buildings: {
                  __any: {
                    name: {
                      __regexp: '^__match$',
                    },
                  },
                },
              },
            },
          ],
        },
      },
      buildings: {
        __objectItem: {
          name: {},
          location: {},
        },
      },
    };

    const validSpecs = {
      vehicles: [
        {
          name: 'bus',
          location: 'woodland',
        },
        {
          name: 'plane',
          location: 'five star',
        },
      ],
      buildings: {
        cabin: {
          name: 'woodland',
          location: 'woods',
        },
        hotel: {
          name: 'five star',
          location: 'Malta',
        },
      },
    };

    const invalidSpecs = {
      vehicles: [
        {
          name: 'bus',
          location: 'woodland',
        },
        {
          name: 'plane',
          location: 'Malta',
        },
      ],
      buildings: {
        cabin: {
          name: 'woodland',
          location: 'woods',
        },
        hotel: {
          name: 'five star',
          location: 'Malta',
        },
      },
    };

    expect(validator.validateJson(validSpecs, template)).toEqual({ valid: true, messages: [] });
    expect(validator.validateJson(invalidSpecs, template)).toEqual({
      valid: false,
      messages: [msg.conditionNotMetMessage(['vehicles[1]', 'location'], 'location')],
    });
  });
});
