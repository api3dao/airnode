import { ethers } from 'ethers';
import { Airnode, DeployState as State, RequesterAccount } from '../../types';
import { addressToDerivationPath, deriveExtendedPublicKey, deriveWalletFromPath } from '../utils';

export async function assignAirnodeAccounts(state: State): Promise<State> {
  const airnodesByName: { [name: string]: Airnode } = {};
  for (const airnodeName of Object.keys(state.config.airnodes)) {
    const airnode = state.config.airnodes[airnodeName];
    const airnodeWallet = deriveWalletFromPath(airnode.mnemonic, 'm', state.provider);
    const xpub = deriveExtendedPublicKey(airnode.mnemonic);

    airnodesByName[airnodeName] = {
      masterWalletAddress: airnodeWallet.address,
      mnemonic: airnode.mnemonic,
      signer: airnodeWallet,
      xpub,
    };
  }
  return { ...state, airnodesByName };
}

export async function assignRequesterAccounts(state: State): Promise<State> {
  const requestersById: { [id: string]: RequesterAccount } = {};
  for (const configRequester of state.config.requesters) {
    const requesterWallet = ethers.Wallet.createRandom().connect(state.provider);
    const requesterAddress = requesterWallet.address;

    requestersById[configRequester.id] = {
      address: requesterAddress,
      designatedWallets: [],
      signer: requesterWallet,
    };
  }

  return { ...state, requestersById };
}

export async function assignDesignatedWallets(state: State) {
  const requestersById: { [id: string]: RequesterAccount } = {};
  for (const configRequester of state.config.requesters) {
    const requester = state.requestersById[configRequester.id];
    const designatedAirnodeNames = Object.keys(configRequester.airnodes);

    const designatedWallets = designatedAirnodeNames.map((airnodeName) => {
      const airnode = state.airnodesByName[airnodeName];
      const wallet = deriveWalletFromPath(
        airnode.mnemonic,
        `m/0/${addressToDerivationPath(requester.address)}`,
        state.provider
      );
      return {
        address: wallet.address,
        airnodeName: airnodeName,
        wallet,
      };
    });

    requestersById[configRequester.id] = { ...requester, designatedWallets };
  }

  return { ...state, requestersById };
}
