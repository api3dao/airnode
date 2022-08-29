import * as parser from './path-parser';

describe('parsePathWithParameters', () => {
  it('does nothing if the path has no parameters', () => {
    const rawPath = '/users/1/update/password';
    const parameters = { key: 'ignored' };
    const path = parser.parsePathWithParameters(rawPath, parameters);
    expect(path).toEqual('/users/1/update/password');
  });

  it('replaces parameters in braces', () => {
    const rawPath = '/users/{id}/{action}/test';
    const parameters = { id: '123', action: 'update' };
    const path = parser.parsePathWithParameters(rawPath, parameters);
    expect(path).toEqual('/users/123/update/test');
  });

  it('throws an error if parameters are omitted', () => {
    const rawPath = '/users/{id}/{action}/{value}';
    const parameters = { id: '123' };
    expect(() => {
      parser.parsePathWithParameters(rawPath, parameters);
    }).toThrow(new Error("The following path parameters were expected but not provided: 'action', 'value'"));
  });
});
