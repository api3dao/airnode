import { CoordinatorSettings } from '../../../src/types';

export function buildCoordinatorSettings(settings?: Partial<CoordinatorSettings>): CoordinatorSettings {
  return {
    logFormat: 'plain',
    providerId: '0x19255a4ec31e89cea54d1f125db7536e874ab4a96b4d4f6438668b6bb10a6adb',
    providerIdShort: '19255a4',
    region: 'us-east-1',
    stage: 'test',
    ...settings,
  };
}
