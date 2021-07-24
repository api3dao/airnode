import * as convertor from '../src/convertor';

describe('actions (docs)', () => {
  it('copy action', () => {
    const template = {
      company: {},
      inventory: {
        __arrayItem: {
          name: {},
          quantity: {},
        },
        __actions: [
          {
            __copy: {
              __target: "[ 'backups', '[[ \\'/\\', \\'company\\' ]]' ]",
            },
          },
        ],
      },
    };

    const specs = {
      company: 'anon',
      inventory: [
        {
          name: 'item1',
          quantity: 10,
        },
        {
          name: 'item2',
          quantity: 3,
        },
      ],
    };

    expect(convertor.convertJson(specs, template)).toEqual({
      valid: true,
      messages: [],
      output: {
        backups: {
          anon: [
            {
              name: 'item1',
              quantity: 10,
            },
            {
              name: 'item2',
              quantity: 3,
            },
          ],
        },
      },
    });
  });

  it('insert action', () => {
    const template = {
      original: {},
      __actions: [
        {
          __insert: {
            __target: "[ 'example1' ]",
            __value: 'inserted',
          },
        },
        {
          __insert: {
            __target: "[ 'example2' ]",
            __value: {
              obj: {
                value: 'inserted',
              },
            },
          },
        },
      ],
    };

    const specs = {
      original: {},
    };

    expect(convertor.convertJson(specs, template)).toEqual({
      valid: true,
      messages: [],
      output: {
        example1: 'inserted',
        example2: {
          obj: {
            value: 'inserted',
          },
        },
      },
    });
  });

  it('arrays', () => {
    const template = {
      __objectItem: {
        __objectItem: {
          location: {},
          __actions: [
            {
              __copy: {
                __target: "[ 'vehicles[]' ]",
              },
            },
            {
              __insert: {
                __target: "[ 'vehicles[_]' ]",
                __value: {
                  type: '{{0}}',
                  name: '{{1}}',
                },
              },
            },
          ],
        },
      },
    };

    const specs = {
      bus: {
        small_bus: {
          location: 'Portugal',
        },
        long_bus: {
          location: 'Slovenia',
        },
      },
      plane: {
        jet: {
          location: 'Turkey',
        },
      },
    };

    expect(convertor.convertJson(specs, template)).toEqual({
      valid: true,
      messages: [],
      output: {
        vehicles: [
          {
            location: 'Portugal',
            type: 'bus',
            name: 'small_bus',
          },
          {
            location: 'Slovenia',
            type: 'bus',
            name: 'long_bus',
          },
          {
            location: 'Turkey',
            type: 'plane',
            name: 'jet',
          },
        ],
      },
    });
  });

  it('all', () => {
    const template = {
      __actions: [
        {
          __copy: {
            __target: '[]',
          },
        },
        {
          __insert: {
            __target: "[ 'allArray', '__all', 'inserted' ]",
            __value: 'inserted',
          },
        },
        {
          __insert: {
            __target: "[ 'allObject', '__all', 'inserted' ]",
            __value: 'inserted',
          },
        },
      ],
      allArray: {
        __arrayItem: {
          name: {},
        },
      },
      allObject: {
        __objectItem: {},
      },
    };

    const specs = {
      allArray: [
        {
          name: 'item1',
        },
        {
          name: 'item2',
        },
      ],
      allObject: {
        item3: {},
        item4: {},
      },
    };

    expect(convertor.convertJson(specs, template)).toEqual({
      valid: true,
      messages: [],
      output: {
        allArray: [
          {
            name: 'item1',
            inserted: 'inserted',
          },
          {
            name: 'item2',
            inserted: 'inserted',
          },
        ],
        allObject: {
          item3: {
            inserted: 'inserted',
          },
          item4: {
            inserted: 'inserted',
          },
        },
      },
    });
  });
});
