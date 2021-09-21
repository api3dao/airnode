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
  static deriveWalletPathFromSponsorAddress = (sponsorAddress: string) =>
    admin.deriveWalletPathFromSponsorAddress(sponsorAddress);

  constructor(public airnodeRrp: AirnodeRrp) {}

  deriveSponsorWalletAddress = (airnodeAddress: string, sponsorAddress: string, xpub?: string) =>
    admin.deriveSponsorWalletAddress(this.airnodeRrp, airnodeAddress, sponsorAddress, xpub);

  sponsorRequester = (requesterAddress: string) => admin.sponsorRequester(this.airnodeRrp, requesterAddress);

  unsponsorRequester = (requesterAddress: string) => admin.unsponsorRequester(this.airnodeRrp, requesterAddress);

  createTemplate = (template: admin.Template) => admin.createTemplate(this.airnodeRrp, template);

  requestWithdrawal = (airnodeAddress: string, sponsorWallet: string) =>
    admin.requestWithdrawal(this.airnodeRrp, airnodeAddress, sponsorWallet);

  checkWithdrawalRequest = (withdrawalRequestId: string) =>
    admin.checkWithdrawalRequest(this.airnodeRrp, withdrawalRequestId);

  setAirnodeXpub = () => admin.setAirnodeXpub(this.airnodeRrp);

  getAirnodeXpub = (airnodeAddress: string) => admin.getAirnodeXpub(this.airnodeRrp, airnodeAddress);

  requesterToRequestCountPlusOne = (requesterAddress: string) =>
    admin.requesterToRequestCountPlusOne(this.airnodeRrp, requesterAddress);

  getTemplate = (templateId: string) => admin.getTemplate(this.airnodeRrp, templateId);

  getTemplates = (templateIds: string[]) => admin.getTemplates(this.airnodeRrp, templateIds);

  sponsorToRequesterToSponsorshipStatus = (sponsorAddress: string, requesterAddress: string) =>
    admin.sponsorToRequesterToSponsorshipStatus(this.airnodeRrp, sponsorAddress, requesterAddress);

  sponsorToWithdrawalRequestCount = (sponsorAddress: string) =>
    admin.sponsorToWithdrawalRequestCount(this.airnodeRrp, sponsorAddress);

  fulfillWithdrawal = (requestId: string, airnodeAddress: string, sponsorAddress: string, amount: string) =>
    admin.fulfillWithdrawal(this.airnodeRrp, requestId, airnodeAddress, sponsorAddress, amount);
}
