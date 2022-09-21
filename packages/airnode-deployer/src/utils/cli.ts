import * as crypto from 'crypto';
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

export function hashDeployment(
  cloudProvider: CloudProvider['type'],
  region: string,
  airnodeAddress: string,
  stage: string,
  airnodeVersion: string
) {
  return crypto
    .createHash('sha256')
    .update([cloudProvider, region, airnodeAddress, stage, airnodeVersion].join(''))
    .digest('hex')
    .substring(0, 8);
}

export function cloudProviderReadable(cloudProvider: CloudProvider['type'], region: string) {
  return `${cloudProvider.toUpperCase()} (${region})`;
}

export function airnodeAddressReadable(airnodeAddress: string) {
  return `${airnodeAddress.slice(0, 8)}...${airnodeAddress.slice(-6)}`;
}

export function lastUpdateReadable(deploymentTimestamp: string) {
  return format(parseInt(deploymentTimestamp), 'yyyy-MM-dd HH:mm:ss zzz');
}
