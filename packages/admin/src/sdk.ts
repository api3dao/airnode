import { AirnodeRrp } from '@airnode/protocol';
import * as evm from './evm';
import * as admin from '.';

/*
 * Class versin of the SDK bound to AirnodeRrp contract instance
 */
export class AdminSdk {
  static getAirnodeRrp = evm.getAirnodeRrp;
  static getAirnodeRrpWithSigner = evm.getAirnodeRrpWithSigner;

  constructor(public airnodeRrp: AirnodeRrp) {}

  clientAddressToNoRequests = (clientAddress: string) =>
    admin.clientAddressToNoRequests(this.airnodeRrp, clientAddress);

  // TODO: create other methods
}
