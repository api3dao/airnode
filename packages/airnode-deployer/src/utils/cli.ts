import join from 'lodash/join';
import omitBy from 'lodash/omitBy';

export function longArguments(args: Record<string, any>) {
  return JSON.stringify(omitBy(args, (_, arg) => arg === '$0' || arg.length === 1));
}

export function printableArguments(args: string[]) {
  return join(
    args.map((arg) => `--${arg}`),
    ', '
  );
}
