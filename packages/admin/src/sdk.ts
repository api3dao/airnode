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
  static deriveWalletPathFromAddress = (address: string) => admin.deriveWalletPathFromAddress(address);

  constructor(public airnodeRrp: AirnodeRrp) {}

  deriveSponsorWallet = (mnemonic: string, sponsor: string) => admin.deriveSponsorWallet(mnemonic, sponsor);

  endorseRequester = (requester: string) => admin.endorseRequester(this.airnodeRrp, requester);

  unendorseRequester = (requester: string) => admin.unendorseRequester(this.airnodeRrp, requester);

  createTemplate = (template: admin.Template) => admin.createTemplate(this.airnodeRrp, template);

  requestWithdrawal = (airnodeId: string, sponsorWallet: string, destination: string) =>
    admin.requestWithdrawal(this.airnodeRrp, airnodeId, sponsorWallet, destination);

  checkWithdrawalRequest = (withdrawalRequestId: string) =>
    admin.checkWithdrawalRequest(this.airnodeRrp, withdrawalRequestId);

  setAirnodeXpub = () => admin.setAirnodeXpub(this.airnodeRrp);

  getAirnodeXpub = (airnode: string) => admin.getAirnodeXpub(this.airnodeRrp, airnode);

  setAirnodeAuthorizers = (authorizers: string[]) => admin.setAirnodeAuthorizers(this.airnodeRrp, authorizers);

  getAirnodeAuthorizers = (airnode: string) => admin.getAirnodeAuthorizers(this.airnodeRrp, airnode);

  requesterToRequestCountPlusOne = (requester: string) =>
    admin.requesterToRequestCountPlusOne(this.airnodeRrp, requester);

  getTemplate = (templateId: string) => admin.getTemplate(this.airnodeRrp, templateId);

  getTemplates = (templateIds: string[]) => admin.getTemplates(this.airnodeRrp, templateIds);

  sponsorToRequesterToSponsorshipStatus = (sponsor: string, requester: string) =>
    admin.sponsorToRequesterToSponsorshipStatus(this.airnodeRrp, sponsor, requester);

  sponsorToWithdrawalRequestCount = (sponsor: string) =>
    admin.sponsorToWithdrawalRequestCount(this.airnodeRrp, sponsor);

  fulfillWithdrawal = (requestId: string, airnodeId: string, sponsor: string, destination: string, amount: string) =>
    admin.fulfillWithdrawal(this.airnodeRrp, requestId, airnodeId, sponsor, destination, amount);
}
