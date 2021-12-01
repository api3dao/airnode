import { formatTerraformArguments } from './infrastructure';

describe('formatTerraformArguments', () => {
  it(`prepends string arguments with '-'`, () => {
    const args = ['arg1', 'arg2', 'arg3'];
    expect(formatTerraformArguments(args)).toEqual(['-arg1', '-arg2', '-arg3']);
  });

  it(`formats two string array into '-key=value' format`, () => {
    const args = [
      ['arg1', 'value1'],
      ['arg2', 'value2'],
      ['arg3', 'value3'],
    ] as [string, string][];
    expect(formatTerraformArguments(args)).toEqual(['-arg1=value1', '-arg2=value2', '-arg3=value3']);
  });

  it(`formats three string array into '-outer_key="inner_key=value"' format`, () => {
    const args = [
      ['outer_key1', 'inner_key1', 'value1'],
      ['outer_key2', 'inner_key2', 'value2'],
      ['outer_key3', 'inner_key3', 'value3'],
    ] as [string, string, string][];
    expect(formatTerraformArguments(args)).toEqual([
      '-outer_key1="inner_key1=value1"',
      '-outer_key2="inner_key2=value2"',
      '-outer_key3="inner_key3=value3"',
    ]);
  });
});
