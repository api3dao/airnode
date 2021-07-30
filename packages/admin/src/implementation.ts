import * as airnodeAbi from '@api3/airnode-abi';
import { AirnodeRrp } from '@api3/protocol';
import { ethers } from 'ethers';

const assertAllParamsAreReturned = (params: object, ethersParams: any[]) => {
  if (Object.keys(params).length !== ethersParams.length) {
    throw new Error(`SDK doesn't return some of the parameters!`);
  }
};

/**
 * HD wallets allow us to create multiple accounts from a single mnemonic.
 * Each sponsor creates a designated wallet for each provider to use
 * in order for them to be able to respond to the requests their requesters make.
 *
 * By convention derivation paths start with a master index
 * followed by child indexes that can be any integer up to 2^31.
 *
 * Since addresses can be represented as 160bits (20bytes) we can then
 * split it in chunks of 31bits and create a path with the following pattern:
 * m/0/1st31bits/2nd31bits/3rd31bits/4th31bits/5th31bits/6th31bits.
 *
 * @param address A string representing a 20bytes hex address
 * @returns The path derived from the address
 */
export const deriveWalletPathFromAddress = (address: string): string => {
  const addressBN = ethers.BigNumber.from(ethers.utils.getAddress(address));
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const shiftedAddressBN = addressBN.shr(31 * i);
    paths.push(shiftedAddressBN.mask(31).toString());
  }
  return `m/0/${paths.join('/')}`;
};

export async function deriveSponsorWallet(mnemonic: string, sponsor: string) {
  const hdNodeFromMnemonic = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const sponsorWalletHdNode = hdNodeFromMnemonic.derivePath(deriveWalletPathFromAddress(sponsor));
  return sponsorWalletHdNode.address;
}

export async function endorseRequester(airnodeRrp: AirnodeRrp, requester: string) {
  await airnodeRrp.setSponsorshipStatus(requester, true);
  return requester;
}

export async function unendorseRequester(airnodeRrp: AirnodeRrp, requester: string) {
  await airnodeRrp.setSponsorshipStatus(requester, false);
  return requester;
}

export interface Template {
  parameters: string | airnodeAbi.InputParameter[];
  airnode: string;
  endpointId: string;
}

export async function createTemplate(airnodeRrp: AirnodeRrp, template: Template) {
  let encodedParameters;
  if (typeof template.parameters == 'string') {
    encodedParameters = template.parameters;
  } else {
    encodedParameters = airnodeAbi.encode(template.parameters);
  }
  const tx = await airnodeRrp.createTemplate(template.airnode, template.endpointId, encodedParameters);

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.templateId);
    })
  );
}

export async function requestWithdrawal(
  airnodeRrp: AirnodeRrp,
  airnode: string,
  sponsorWallet: string,
  destination: string
) {
  const tx = await airnodeRrp.requestWithdrawal(airnode, sponsorWallet, destination);

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.withdrawalRequestId);
    })
  );
}

export async function checkWithdrawalRequest(airnodeRrp: AirnodeRrp, requestId: string) {
  const filter = airnodeRrp.filters.FulfilledWithdrawal(null, null, requestId, null, null, null);

  const logs = await airnodeRrp.queryFilter(filter);
  if (logs.length === 0) {
    return undefined;
  }

  const ethersLogParams = logs[0].args;
  // remove array parameters from ethers response
  const { airnode, sponsor, withdrawalRequestId, sponsorWallet, destination, amount } = ethersLogParams;
  const logParams = { airnode, sponsor, withdrawalRequestId, sponsorWallet, destination, amount };
  assertAllParamsAreReturned(logParams, ethersLogParams);

  // cast ethers BigNumber for portability
  return { ...logParams, amount: amount.toString() };
}

const isEthersWallet = (signer: any): signer is ethers.Wallet => !!signer.mnemonic;

export async function setAirnodeXpub(airnodeRrp: AirnodeRrp) {
  const wallet = airnodeRrp.signer;

  if (!isEthersWallet(wallet)) {
    throw new Error('Expected AirnodeRrp contract signer must be an ethers.Wallet instance');
  }

  const hdNode = ethers.utils.HDNode.fromMnemonic(wallet.mnemonic.phrase);
  const xpub = hdNode.neuter().extendedKey;

  const tx = await airnodeRrp.setAirnodeXpub(xpub);

  return new Promise<string>((resolve) =>
    airnodeRrp.provider.once(tx.hash, ({ logs }) => {
      const parsedLog = airnodeRrp.interface.parseLog(logs[0]);
      resolve(parsedLog.args.xpub);
    })
  );
}

export async function getAirnodeXpub(airnodeRrp: AirnodeRrp, airnode: string) {
  return airnodeRrp.airnodeToXpub(airnode);
}

export async function setAirnodeAuthorizers(airnodeRrp: AirnodeRrp, authorizers: string[]) {
  const tx = await airnodeRrp.setAirnodeAuthorizers(authorizers);

  return new Promise<string[]>((resolve) =>
    airnodeRrp.provider.once(tx.hash, (tx) => {
      const parsedLog = airnodeRrp.interface.parseLog(tx.logs[0]);
      resolve(parsedLog.args.authorizers);
    })
  );
}

export async function getAirnodeAuthorizers(airnodeRrp: AirnodeRrp, airnode: string) {
  return airnodeRrp.getAirnodeAuthorizers(airnode);
}

export async function deriveEndpointId(oisTitle: string, endpointName: string) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['string'], [`${oisTitle}_${endpointName}`]));
}

export async function requesterToRequestCountPlusOne(airnodeRrp: AirnodeRrp, requester: string) {
  return (await airnodeRrp.requesterToRequestCountPlusOne(requester)).toString();
}

export async function getTemplate(airnodeRrp: AirnodeRrp, templateId: string) {
  const ethersTemplate = await airnodeRrp.getTemplates([templateId]);

  // remove array parameters from ethers response
  const {
    airnodes: [airnode],
    endpointIds: [endpointId],
    parameters: [parameters],
  } = ethersTemplate;
  const template = { airnode, endpointId, parameters };
  assertAllParamsAreReturned(template, ethersTemplate);

  return template;
}

export async function getTemplates(airnodeRrp: AirnodeRrp, templateIds: string[]) {
  const ethersTemplate = await airnodeRrp.getTemplates(templateIds);

  // remove array parameters from ethers response
  const { airnodes, endpointIds, parameters } = ethersTemplate;
  const templates = { airnodes, endpointIds, parameters };
  assertAllParamsAreReturned(templates, ethersTemplate);

  const formattedTemplates = airnodes.map((_, i) => ({
    airnode: airnodes[i],
    endpointId: endpointIds[i],
    parameters: parameters[i],
  }));
  return formattedTemplates;
}

export function sponsorToRequesterToSponsorshipStatus(airnodeRrp: AirnodeRrp, sponsor: string, requester: string) {
  return airnodeRrp.sponsorToRequesterToSponsorshipStatus(sponsor, requester);
}

export async function sponsorToWithdrawalRequestCount(airnodeRrp: AirnodeRrp, sponsor: string) {
  const requestsCount = await airnodeRrp.sponsorToWithdrawalRequestCount(sponsor);
  return requestsCount.toString();
}

export interface FulfillWithdrawalReturnValue {
  airnode: string;
  sponsor: string;
  withdrawalRequestId: string;
  sponsorWallet: string;
  destination: string;
  amount: string;
}

export async function fulfillWithdrawal(
  airnodeRrp: AirnodeRrp,
  requestId: string,
  airnode: string,
  sponsor: string,
  destination: string,
  amount: string
) {
  const tx = await airnodeRrp.fulfillWithdrawal(requestId, airnode, sponsor, destination, {
    value: ethers.utils.parseEther(amount),
  });
  const filter = airnodeRrp.filters.FulfilledWithdrawal(airnode, sponsor, requestId, null, null, null);

  return new Promise<FulfillWithdrawalReturnValue | null>((resolve) =>
    airnodeRrp.once(filter, (airnode, sponsor, withdrawalRequestId, sponsorWallet, destination, amount, event) => {
      if (event.transactionHash !== tx.hash) {
        resolve(null);
      }

      // cast ethers BigNumber for portability
      resolve({ airnode, sponsor, withdrawalRequestId, sponsorWallet, destination, amount: amount.toString() });
    })
  );
}
