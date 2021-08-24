// ===========================================
// Receipt file
// ===========================================

export interface AirnodeWallet {
  airnodeId: string;
  xpub: string;
}

export interface Deployment {
  nodeVersion: string;
  airnodeIdShort: string;
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
