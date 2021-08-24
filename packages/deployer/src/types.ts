import { Config } from '@api3/node';

// ===========================================
// Receipt file
// ===========================================

export interface Receipt {
  airnodeId: string;
  airnodeIdShort: string;
  xpub: string;
  masterWalletAddress: string;
  config: Omit<Config, 'ois' | 'triggers' | 'environment'>;
}
