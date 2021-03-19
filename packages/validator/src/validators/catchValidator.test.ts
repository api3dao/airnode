import { validateCatch } from './catchValidator';
import { Log } from '../types';

describe('Catch validator', () => {
  const messages: Log[] = [
    { message: 'Already existing error', level: 'error' },
    { message: 'Already existing warning', level: 'warning' },
  ];

  it('Basic functionality', () => {
    const template = {
      __catch: {
        __message: 'Simple message',
      },
    };

    expect(validateCatch({}, template, messages, 'paramPath', 'prefix', {})).toEqual([
      { message: 'Simple message', level: 'error' },
    ]);
    expect(validateCatch({}, template, [], 'paramPath', 'prefix', {})).toEqual([]);
  });

  it('Specified level', () => {
    let template = {
      __catch: {
        __message: 'Simple message',
        __level: 'error',
      },
    };

    expect(validateCatch({}, template, messages, 'paramPath', 'prefix', {})).toEqual([
      { message: 'Simple message', level: 'error' },
    ]);

    template = {
      __catch: {
        __message: 'Simple message',
        __level: 'warning',
      },
    };

    expect(validateCatch({}, template, messages, 'paramPath', 'prefix', {})).toEqual([
      { message: 'Simple message', level: 'warning' },
    ]);
  });

  it("Keywords '__fullPath' and '__path' are correctly replaced", () => {
    const template = {
      __catch: {
        __message: 'Message from __path in __fullPath',
        __level: 'error',
      },
    };

    expect(validateCatch({}, template, messages, 'paramPath', 'prefix', {})).toEqual([
      { message: 'Message from paramPath in prefix.paramPath', level: 'error' },
    ]);
  });

  it("Keyword '__value' is correctly replaced", () => {
    const template = {
      __catch: {
        __message: 'Simple __value message',
        __level: 'warning',
      },
    };

    expect(validateCatch('warning', template, messages, 'paramPath', 'prefix', {})).toEqual([
      { message: 'Simple warning message', level: 'warning' },
    ]);
  });

  it('Parameter index', () => {
    const template = {
      __catch: {
        __message: '2nd parameter from root is {{1}}',
      },
    };

    expect(validateCatch({}, template, messages, 'param1.array[2].param2', 'prefix', {})).toEqual([
      { message: '2nd parameter from root is array[2]', level: 'error' },
    ]);
  });

  describe('Parameter value', () => {
    it('Relative', () => {
      const template = {
        __catch: {
          __message: 'Value of parameter is: [[outer.parameter]]',
        },
      };

      const specs = {
        outer: {
          parameter: 'ok',
        },
      };

      expect(validateCatch(specs, template, messages, 'path', 'prefix', {})).toEqual([
        { message: 'Value of parameter is: ok', level: 'error' },
      ]);
    });

    it('Absolute', () => {
      const template = {
        __catch: {
          __message: 'Value of parameter is: [[/outer.inner.parameter]]',
        },
      };

      const specs = {
        outer: {
          inner: {
            parameter: 'absolute',
          },
          currentSpecs: {},
        },
      };

      expect(
        validateCatch(specs['outer']['currentSpecs'], template, messages, 'outer.currentSpecs', 'prefix', specs)
      ).toEqual([{ message: 'Value of parameter is: absolute', level: 'error' }]);
    });
  });

  it('Parameter index and value', () => {
    const template = {
      __catch: {
        __message: 'Value of {{1}} is: [[/{{0}}.inner.parameter]]',
      },
    };

    const specs = {
      outer: {
        inner: {
          parameter: 'ok',
        },
        currentSpecs: {},
      },
    };

    expect(
      validateCatch(specs['outer']['currentSpecs'], template, messages, 'outer.currentSpecs', 'prefix', specs)
    ).toEqual([{ message: 'Value of currentSpecs is: ok', level: 'error' }]);
  });
});
