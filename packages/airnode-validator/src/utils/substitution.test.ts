import * as utils from './utils';

describe('substitution', () => {
  it('conditional match substitution', () => {
    const match = '([.])';
    const escapedMatch = '\\(\\[\\.\\]\\)';

    const template = {
      array: ['test __match'],
      'test-__match': {
        __keyRegexp: '^test-__match$',
        inner: {
          __regexp: '^__match$',
        },
      },
    };

    const expected = JSON.stringify({
      array: [`test ${match}`],
      [`test-${match}`]: {
        __keyRegexp: `^test-${escapedMatch}$`,
        inner: {
          __regexp: `^${escapedMatch}$`,
        },
      },
    });

    expect(JSON.stringify(utils.replaceConditionalMatch(match, template))).toBe(expected);
  });

  it('value from path substitution', () => {
    const value = '([.])';
    const escapedValue = '\\(\\[\\.\\]\\)';
    const path = "[[ 'test' ]]";

    const template = {
      test: value,
      array: [`test ${path}`],
      [`test-${path}`]: {
        __keyRegexp: `^test-${path}$`,
        inner: {
          __regexp: `^${path}$`,
        },
      },
    };

    const expected = JSON.stringify({
      test: value,
      array: [`test ${value}`],
      [`test-${value}`]: {
        __keyRegexp: `^test-${escapedValue}$`,
        inner: {
          __regexp: `^${escapedValue}$`,
        },
      },
    });

    expect(JSON.stringify(utils.replacePathsWithValues(template, template, template))).toBe(expected);
  });

  it('param index substitution', () => {
    const parameter = '([.])';
    const escapedParameter = '\\(\\[\\.\\]\\)';
    const index = '{{0}}';

    const template = {
      array: [`test ${index}`],
      [`test-${index}`]: {
        __keyRegexp: `^test-${index}$`,
        inner: {
          __regexp: `^${index}$`,
        },
      },
    };

    const expected = JSON.stringify({
      array: [`test ${parameter}`],
      [`test-${parameter}`]: {
        __keyRegexp: `^test-${escapedParameter}$`,
        inner: {
          __regexp: `^${escapedParameter}$`,
        },
      },
    });

    expect(JSON.stringify(utils.replaceParamIndexWithName(template, [parameter]))).toBe(expected);
  });
});
