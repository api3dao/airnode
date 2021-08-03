export const template =
  // >> type-template
  {
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
// << type-template

export const validSpecs =
  // >> type-valid-specs
  {
    list: [
      {
        item: 'This is array',
      },
    ],
    str: 'This is string',
    regex: 'Also a string',
    num: 123,
  };
// << type-valid-specs

export const invalidSpecs =
  // >> type-invalid-specs
  {
    list: {
      item: 'This is object',
    },
    str: 123,
    regex: {},
    num: '123',
  };
// << type-invalid-specs

export const invalidOut =
  // >> type-invalid-out
  {
    valid: false,
    messages: [
      { level: 'error', message: 'Type mismatch: parameter list is expected to be array' },
      { level: 'error', message: 'Type mismatch: parameter str is expected to be string' },
      { level: 'error', message: 'Type mismatch: parameter regex is expected to be string' },
      { level: 'error', message: 'Type mismatch: parameter num is expected to be number' },
      { level: 'warning', message: 'Extra field: list.item' },
    ],
  };
// << type-invalid-out
