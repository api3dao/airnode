import * as crypto from 'crypto';
import { format } from 'date-fns-tz';
import { CloudProvider, cloudProviderSchema } from '@api3/airnode-node';
import join from 'lodash/join';
import omitBy from 'lodash/omitBy';

export const availableCloudProviders = Array.from(cloudProviderSchema.options.keys()) as CloudProvider['type'][];

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
  return `${cloudProvider}${crypto
    .createHash('sha256')
    .update([cloudProvider, region, airnodeAddress, stage, airnodeVersion].join(''))
    .digest('hex')
    .substring(0, 8)}`;
}

export function hashDeploymentVersion(
  cloudProvider: CloudProvider['type'],
  region: string,
  airnodeAddress: string,
  stage: string,
  airnodeVersion: string,
  timestamp: string
) {
  return crypto
    .createHash('sha256')
    .update([cloudProvider, region, airnodeAddress, stage, airnodeVersion, timestamp].join(''))
    .digest('hex')
    .substring(0, 8);
}

export function cloudProviderReadable(cloudProvider: CloudProvider['type'], region: string) {
  return `${cloudProvider.toUpperCase()} (${region})`;
}

export function airnodeAddressReadable(airnodeAddress: string) {
  return `${airnodeAddress.slice(0, 8)}...${airnodeAddress.slice(-6)}`;
}

export function timestampReadable(timestamp: string) {
  return format(parseInt(timestamp), 'yyyy-MM-dd HH:mm:ss zzz');
}
