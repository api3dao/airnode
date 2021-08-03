export const template =
  // >> regex-template
  {
    string: {
      __regexp: '^(string|char)$',
    },
    numbers: {
      __keyRegexp: '^[0-9]+$',
      __objectItem: {
        __regexp: '^\\\\[a-z]+\\s$',
      },
    },
  };
// << regex-template

export const validSpecs =
  // >> regex-valid-specs
  {
    string: 'string',
    numbers: {
      '3': '\\three ',
      '10': '\\ten ',
      '42': '\\yes ',
    },
  };
// << regex-valid-specs

export const invalidSpecs =
  // >> regex-invalid-specs
  {
    string: 'boolean',
    numbers: {
      string: '\\NaN ',
      '5': 'five ',
      '1': '\\one',
    },
  };
// << regex-invalid-specs

export const invalidOut =
  // >> regex-invalid-out
  {
    valid: false,
    messages: [
      { level: 'warning', message: 'string is not formatted correctly' },
      { level: 'error', message: 'Key string in numbers.string is formatted incorrectly' },
      { level: 'warning', message: 'numbers.1 is not formatted correctly' },
      { level: 'warning', message: 'numbers.5 is not formatted correctly' },
      { level: 'warning', message: 'numbers.string is not formatted correctly' },
    ],
  };
// << regex-invalid-out
