import { format } from 'date-fns-tz';
import { CloudProvider } from '@api3/airnode-node';
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

export function cloudProviderReadable(cloudProvider: CloudProvider) {
  return `${cloudProvider.type.toUpperCase()} (${cloudProvider.region})`;
}

export function airnodeAddressReadable(airnodeAddress: string) {
  return `${airnodeAddress.slice(0, 8)}...${airnodeAddress.slice(-6)}`;
}

export function timestampReadable(timestamp: string) {
  return format(parseInt(timestamp), 'yyyy-MM-dd HH:mm:ss zzz');
}
