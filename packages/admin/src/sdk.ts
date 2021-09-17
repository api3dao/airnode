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
  static deriveWalletPathFromSponsorAddress = (address: string) => admin.deriveWalletPathFromSponsorAddress(address);

  constructor(public airnodeRrp: AirnodeRrp) {}

  deriveSponsorWallet = (airnode: string, sponsor: string, xpub?: string) =>
    admin.deriveSponsorWallet(this.airnodeRrp, airnode, sponsor, xpub);

  sponsorRequester = (requester: string) => admin.sponsorRequester(this.airnodeRrp, requester);

  unsponsorRequester = (requester: string) => admin.unsponsorRequester(this.airnodeRrp, requester);

  createTemplate = (template: admin.Template) => admin.createTemplate(this.airnodeRrp, template);

  requestWithdrawal = (airnode: string, sponsorWallet: string) =>
    admin.requestWithdrawal(this.airnodeRrp, airnode, sponsorWallet);

  checkWithdrawalRequest = (withdrawalRequestId: string) =>
    admin.checkWithdrawalRequest(this.airnodeRrp, withdrawalRequestId);

  setAirnodeXpub = () => admin.setAirnodeXpub(this.airnodeRrp);

  getAirnodeXpub = (airnode: string) => admin.getAirnodeXpub(this.airnodeRrp, airnode);

  requesterToRequestCountPlusOne = (requester: string) =>
    admin.requesterToRequestCountPlusOne(this.airnodeRrp, requester);

  getTemplate = (templateId: string) => admin.getTemplate(this.airnodeRrp, templateId);

  getTemplates = (templateIds: string[]) => admin.getTemplates(this.airnodeRrp, templateIds);

  sponsorToRequesterToSponsorshipStatus = (sponsor: string, requester: string) =>
    admin.sponsorToRequesterToSponsorshipStatus(this.airnodeRrp, sponsor, requester);

  sponsorToWithdrawalRequestCount = (sponsor: string) =>
    admin.sponsorToWithdrawalRequestCount(this.airnodeRrp, sponsor);

  fulfillWithdrawal = (requestId: string, airnode: string, sponsor: string, amount: string) =>
    admin.fulfillWithdrawal(this.airnodeRrp, requestId, airnode, sponsor, amount);
}
