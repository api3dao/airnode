import { AirnodeRrp } from '@api3/protocol';
import * as evm from './evm';
import * as admin from './implementation';

/*
 * Class version of the SDK bound to AirnodeRrp contract instance
 */
export class AdminSdk {
  static getAirnodeRrp = evm.getAirnodeRrp;
  static getAirnodeRrpWithSigner = evm.getAirnodeRrpWithSigner;
  static deriveEndpointId = (oisTitle: string, endpointName: string) => admin.deriveEndpointId(oisTitle, endpointName);
  static addressToDerivationPath = (address: string) => admin.addressToDerivationPath(address);

  constructor(public airnodeRrp: AirnodeRrp) {}

  deriveDesignatedWallet = (airnodeId: string, requester: string) =>
    admin.deriveDesignatedWallet(this.airnodeRrp, airnodeId, requester);

  endorseClient = (clientAddress: string) => admin.endorseClient(this.airnodeRrp, clientAddress);

  unendorseClient = (clientAddress: string) => admin.unendorseClient(this.airnodeRrp, clientAddress);

  createTemplate = (template: admin.Template) => admin.createTemplate(this.airnodeRrp, template);

  requestWithdrawal = (airnodeId: string, requester: string, destination: string) =>
    admin.requestWithdrawal(this.airnodeRrp, airnodeId, requester, destination);

  checkWithdrawalRequest = (withdrawalRequestId: string) =>
    admin.checkWithdrawalRequest(this.airnodeRrp, withdrawalRequestId);

  setAirnodeParameters = (authorizers: string[]) => admin.setAirnodeParameters(this.airnodeRrp, authorizers);

  clientAddressToNoRequests = (clientAddress: string) =>
    admin.clientAddressToNoRequests(this.airnodeRrp, clientAddress);

  getAirnodeParameters = (airnodeId: string) => admin.getAirnodeParameters(this.airnodeRrp, airnodeId);

  getTemplate = (templateId: string) => admin.getTemplate(this.airnodeRrp, templateId);

  getTemplates = (templateIds: string[]) => admin.getTemplates(this.airnodeRrp, templateIds);

  requesterToClientAddressToEndorsementStatus = (requester: string, clientAddress: string) =>
    admin.requesterToClientAddressToEndorsementStatus(this.airnodeRrp, requester, clientAddress);

  requesterToNextWithdrawalRequestIndex = (requester: string) =>
    admin.requesterToNextWithdrawalRequestIndex(this.airnodeRrp, requester);

  fulfillWithdrawal = (requestId: string, airnodeId: string, requester: string, destination: string, amount: string) =>
    admin.fulfillWithdrawal(this.airnodeRrp, requestId, airnodeId, requester, destination, amount);
}
