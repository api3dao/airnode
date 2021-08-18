import { Config as NodeConfig, NodeSettings as NodeNodeSettings } from '@api3/node';

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type NodeSettings = Optional<NodeNodeSettings, 'airnodeWalletMnemonic'>;
export type Config = Omit<NodeConfig, 'nodeSettings'> & { nodeSettings: NodeSettings };

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
