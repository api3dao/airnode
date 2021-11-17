import { longArguments, printableArguments } from './cli';

describe('longArguments', () => {
  it('keeps only wanted arguments', () => {
    const args = {
      x: 1,
      aaa: 2,
      y: 3,
      bbb: 4,
      $0: 5,
      ccc: 6,
      z: 7,
    };
    expect(longArguments(args)).toEqual(`{"aaa":2,"bbb":4,"ccc":6}`);
  });
});

describe('printableArguments', () => {
  it(`prepends arguments with '--' and joins with ','`, () => {
    const args = ['arg1', 'arg2', 'arg3'];
    expect(printableArguments(args)).toEqual('--arg1, --arg2, --arg3');
  });
});
