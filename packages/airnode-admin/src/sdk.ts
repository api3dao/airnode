import { RequesterAuthorizerWithAirnode, AirnodeRrpV0 } from '@api3/airnode-protocol';
import { ethers } from 'ethers';
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

  constructor(
    public airnodeRrp: AirnodeRrpV0,
    public requesterAuthorizerWithAirnode: RequesterAuthorizerWithAirnode
  ) {}

  deriveAirnodeXpub = (airnodeMnemonic: string) => admin.deriveAirnodeXpub(airnodeMnemonic);

  verifyAirnodeXpub = (airnodeXpub: string, airnodeAddress: string) =>
    admin.verifyAirnodeXpub(airnodeXpub, airnodeAddress);

  deriveSponsorWalletAddress = (airnodeXpub: string, airnodeAddress: string, sponsorAddress: string) =>
    admin.deriveSponsorWalletAddress(airnodeXpub, airnodeAddress, sponsorAddress);

  sponsorRequester = (requesterAddress: string, overrides?: ethers.Overrides) =>
    admin.sponsorRequester(this.airnodeRrp, requesterAddress, overrides);

  unsponsorRequester = (requesterAddress: string, overrides?: ethers.Overrides) =>
    admin.unsponsorRequester(this.airnodeRrp, requesterAddress, overrides);

  createTemplate = (template: admin.TemplateFile, overrides?: ethers.Overrides) =>
    admin.createTemplate(this.airnodeRrp, template, overrides);

  createInlineTemplate = (template: admin.TemplateFile) => admin.createInlineTemplate(template);

  requestWithdrawal = (airnodeAddress: string, sponsorWallet: string, overrides?: ethers.Overrides) =>
    admin.requestWithdrawal(this.airnodeRrp, airnodeAddress, sponsorWallet, overrides);

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

  fulfillWithdrawal = (
    requestId: string,
    airnodeAddress: string,
    sponsorAddress: string,
    amount: string,
    overrides?: ethers.Overrides
  ) => admin.fulfillWithdrawal(this.airnodeRrp, requestId, airnodeAddress, sponsorAddress, amount, overrides);

  setWhitelistExpiration = (
    airnodeAddress: string,
    endpointId: string,
    requesterAddress: string,
    expirationTimestamp: number,
    overrides?: ethers.Overrides
  ) =>
    admin.setWhitelistExpiration(
      this.requesterAuthorizerWithAirnode,
      airnodeAddress,
      endpointId,
      requesterAddress,
      expirationTimestamp,
      overrides
    );

  extendWhitelistExpiration = (
    airnodeAddress: string,
    endpointId: string,
    requesterAddress: string,
    expirationTimestamp: number,
    overrides?: ethers.Overrides
  ) =>
    admin.extendWhitelistExpiration(
      this.requesterAuthorizerWithAirnode,
      airnodeAddress,
      endpointId,
      requesterAddress,
      expirationTimestamp,
      overrides
    );

  setIndefiniteWhitelistStatus = (
    airnodeAddress: string,
    endpointId: string,
    requesterAddress: string,
    status: boolean,
    overrides?: ethers.Overrides
  ) =>
    admin.setIndefiniteWhitelistStatus(
      this.requesterAuthorizerWithAirnode,
      airnodeAddress,
      endpointId,
      requesterAddress,
      status,
      overrides
    );

  getWhitelistStatus = (airnodeAddress: string, endpointId: string, requesterAddress: string) =>
    admin.getWhitelistStatus(this.requesterAuthorizerWithAirnode, airnodeAddress, endpointId, requesterAddress);

  isRequesterWhitelisted = (airnodeAddress: string, endpointId: string, requesterAddress: string) =>
    admin.isRequesterWhitelisted(this.requesterAuthorizerWithAirnode, airnodeAddress, endpointId, requesterAddress);

  generateMnemonic = () => admin.generateMnemonic();

  deriveAirnodeAddress = (airnodeMnemonic: string) => admin.deriveAirnodeAddress(airnodeMnemonic);
}
