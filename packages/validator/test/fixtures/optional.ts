export const template =
  // >> optional-template
  {
    __optional: {
      optionalExample: {
        __regexp: 'optional',
      },
      outer: {
        inner: {},
      },
    },
  };
// << optional-template

export const validSpecs =
  // >> optional-valid-specs
  {
    optionalExample: 'This is optional',
  };
// << optional-valid-specs

export const invalidSpecs =
  // >> optional-invalid-specs
  {
    optionalExample: 'test',
    outer: {},
  };
// << optional-invalid-specs

export const invalidOut =
  // >> optional-invalid-out
  {
    valid: false,
    messages: [
      { level: 'warning', message: 'optionalExample is not formatted correctly' },
      { level: 'error', message: 'Missing parameter outer.inner' },
    ],
  };
// << optional-invalid-out
