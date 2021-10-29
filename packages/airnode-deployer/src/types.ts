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
  cloudProvider: 'aws' | 'local';
  region: string;
  stage: string;
}

export interface Api {
  httpGatewayUrl?: string;
  heartbeatId?: string;
}

export interface Receipt {
  airnodeWallet: AirnodeWallet;
  deployment: Deployment;
  api: Api;
}
