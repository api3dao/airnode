import { RequesterAuthorizerWithAirnode, AirnodeRrp } from '@api3/airnode-protocol';
import * as evm from './evm';
import * as admin from './implementation';

/*
 * Class version of the SDK bound to AirnodeRrp contract instance
 */
export class AdminSdk {
  static getAirnodeRrp = evm.getAirnodeRrp;
  static getRequesterAuthorizerWithAirnode = evm.getRequesterAuthorizerWithAirnode;
  static deriveEndpointId = (oisTitle: string, endpointName: string) => admin.deriveEndpointId(oisTitle, endpointName);
  static deriveWalletPathFromSponsorAddress = (sponsorAddress: string) =>
    admin.deriveWalletPathFromSponsorAddress(sponsorAddress);
  static useAirnodeRrp = evm.useAirnodeRrp;

  constructor(public airnodeRrp: AirnodeRrp, public requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode) {}

  deriveAirnodeXpub = (airnodeMnemonic: string) => admin.deriveAirnodeXpub(airnodeMnemonic);

  verifyAirnodeXpub = (airnodeXpub: string, airnodeAddress: string) =>
    admin.verifyAirnodeXpub(airnodeXpub, airnodeAddress);

  deriveSponsorWalletAddress = (airnodeXpub: string, airnodeAddress: string, sponsorAddress: string) =>
    admin.deriveSponsorWalletAddress(airnodeXpub, airnodeAddress, sponsorAddress);

  sponsorRequester = (requesterAddress: string) => admin.sponsorRequester(this.airnodeRrp, requesterAddress);

  unsponsorRequester = (requesterAddress: string) => admin.unsponsorRequester(this.airnodeRrp, requesterAddress);

  createTemplate = (template: admin.Template) => admin.createTemplate(this.airnodeRrp, template);

  requestWithdrawal = (airnodeAddress: string, sponsorWallet: string) =>
    admin.requestWithdrawal(this.airnodeRrp, airnodeAddress, sponsorWallet);

  checkWithdrawalRequest = (withdrawalRequestId: string) =>
    admin.checkWithdrawalRequest(this.airnodeRrp, withdrawalRequestId);

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

  setWhitelistExpiration = (
    airnodeAddress: string,
    endpointId: string,
    requesterAddress: string,
    expirationTimestamp: number
  ) =>
    admin.setWhitelistExpiration(
      this.requesterAuthorizerWithAirnode,
      airnodeAddress,
      endpointId,
      requesterAddress,
      expirationTimestamp
    );

  extendWhitelistExpiration = (
    airnodeAddress: string,
    endpointId: string,
    requesterAddress: string,
    expirationTimestamp: number
  ) =>
    admin.extendWhitelistExpiration(
      this.requesterAuthorizerWithAirnode,
      airnodeAddress,
      endpointId,
      requesterAddress,
      expirationTimestamp
    );

  setIndefiniteWhitelistStatus = (
    airnodeAddress: string,
    endpointId: string,
    requesterAddress: string,
    status: boolean
  ) =>
    admin.setIndefiniteWhitelistStatus(
      this.requesterAuthorizerWithAirnode,
      airnodeAddress,
      endpointId,
      requesterAddress,
      status
    );

  getWhitelistStatus = (airnodeAddress: string, endpointId: string, requesterAddress: string) =>
    admin.getWhitelistStatus(this.requesterAuthorizerWithAirnode, airnodeAddress, endpointId, requesterAddress);

  isRequesterWhitelisted = (airnodeAddress: string, endpointId: string, requesterAddress: string) =>
    admin.isRequesterWhitelisted(this.requesterAuthorizerWithAirnode, airnodeAddress, endpointId, requesterAddress);

  generateMnemonic = () => admin.generateMnemonic();

  deriveAirnodeAddress = (airnodeMnemonic: string) => admin.deriveAirnodeAddress(airnodeMnemonic);
}
