import { CloudProvider } from '@api3/airnode-node';

// ===========================================
// Receipt file
// ===========================================

export interface AirnodeWallet {
  airnodeAddress: string;
  airnodeAddressShort: string;
  airnodeXpub: string;
}

export interface Deployment {
  nodeVersion: string;
  airnodeAddressShort: string;
  stage: string;
  cloudProvider: CloudProvider;
  timestamp: string;
}

export interface Api {
  httpGatewayUrl?: string;
  httpSignedDataGatewayUrl?: string;
  heartbeatId?: string;
}

export interface Receipt {
  airnodeWallet: AirnodeWallet;
  deployment: Deployment;
  api: Api;
}
