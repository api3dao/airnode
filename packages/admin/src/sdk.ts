import { AirnodeRrp } from '@airnode/protocol';
import { BigNumberish } from 'ethers';
import * as evm from './evm';
import * as admin from '.';

/*
 * Class versin of the SDK bound to AirnodeRrp contract instance
 */
export class AdminSdk {
  static getAirnodeRrp = evm.getAirnodeRrp;
  static getAirnodeRrpWithSigner = evm.getAirnodeRrpWithSigner;
  static deriveEndpointId = (oisTitle: string, endpointName: string) => admin.deriveEndpointId(oisTitle, endpointName);

  constructor(public airnodeRrp: AirnodeRrp) {}

  createRequester = (requesterAdmin: string) => admin.createRequester(this.airnodeRrp, requesterAdmin);

  setRequesterAdmin = (requesterIndex: BigNumberish, requesterAdmin: string) =>
    admin.setRequesterAdmin(this.airnodeRrp, requesterIndex, requesterAdmin);

  deriveDesignatedWallet = (airnodeId: string, requesterIndex: BigNumberish) =>
    admin.deriveDesignatedWallet(this.airnodeRrp, airnodeId, requesterIndex);

  endorseClient = (requesterIndex: BigNumberish, clientAddress: string) =>
    admin.endorseClient(this.airnodeRrp, requesterIndex, clientAddress);

  unendorseClient = (requesterIndex: BigNumberish, clientAddress: string) =>
    admin.unendorseClient(this.airnodeRrp, requesterIndex, clientAddress);

  createTemplate = (template: admin.Template) => admin.createTemplate(this.airnodeRrp, template);

  requestWithdrawal = (airnodeId: string, requesterIndex: BigNumberish, destination: string) =>
    admin.requestWithdrawal(this.airnodeRrp, airnodeId, requesterIndex, destination);

  checkWithdrawalRequest = (withdrawalRequestId: string) =>
    admin.checkWithdrawalRequest(this.airnodeRrp, withdrawalRequestId);

  setAirnodeParameters = (airnodeAdmin: string, authorizers: string[]) =>
    admin.setAirnodeParameters(this.airnodeRrp, airnodeAdmin, authorizers);

  clientAddressToNoRequests = (clientAddress: string) =>
    admin.clientAddressToNoRequests(this.airnodeRrp, clientAddress);

  getAirnodeParameters = (airnodeId: string) => admin.getAirnodeParameters(this.airnodeRrp, airnodeId);

  getTemplate = (templateId: string) => admin.getTemplate(this.airnodeRrp, templateId);

  getTemplates = (templateIds: string[]) => admin.getTemplates(this.airnodeRrp, templateIds);

  requesterIndexToAdmin = (requesterIndex: BigNumberish) =>
    admin.requesterIndexToAdmin(this.airnodeRrp, requesterIndex);

  requesterIndexToClientAddressToEndorsementStatus = (requesterIndex: BigNumberish, clientAddress: string) =>
    admin.requesterIndexToClientAddressToEndorsementStatus(this.airnodeRrp, requesterIndex, clientAddress);

  requesterIndexToNoWithdrawalRequests = (requesterIndex: BigNumberish) =>
    admin.requesterIndexToNoWithdrawalRequests(this.airnodeRrp, requesterIndex);

  fulfilWithdrawal = (
    requestId: string,
    airnodeId: string,
    requesterIndex: BigNumberish,
    destination: string,
    amount: string
  ) => admin.fulfilWithdrawal(this.airnodeRrp, requestId, airnodeId, requesterIndex, destination, amount);
}
