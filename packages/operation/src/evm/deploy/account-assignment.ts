import { ethers } from 'ethers';
import { Airnode, DeployState as State, DesignatedWallet, SponsorAccount } from '../../types';
import { deriveExtendedPublicKey, deriveWalletFromMnemonic, getDesignatedWallet } from '../utils';

export async function assignAirnodeAccounts(state: State): Promise<State> {
  const airnodesByName: { [name: string]: Airnode } = {};
  for (const airnodeName of Object.keys(state.config.airnodes)) {
    const airnode = state.config.airnodes[airnodeName];
    const airnodeWallet = deriveWalletFromMnemonic(airnode.mnemonic, state.provider);
    const xpub = deriveExtendedPublicKey(airnode.mnemonic);

    airnodesByName[airnodeName] = {
      airnodeWalletAddress: airnodeWallet.address,
      mnemonic: airnode.mnemonic,
      signer: airnodeWallet,
      xpub,
    };
  }
  return { ...state, airnodesByName };
}

export async function assignRequesterAccounts(state: State): Promise<State> {
  const sponsorsById: { [id: string]: SponsorAccount } = {};
  for (const configSponsor of state.config.sponsors) {
    const sponsorWallet = ethers.Wallet.createRandom().connect(state.provider);
    const sponsorAddress = sponsorWallet.address;

    sponsorsById[configSponsor.id] = {
      address: sponsorAddress,
      designatedWallets: [],
      signer: sponsorWallet,
    };
  }

  return { ...state, sponsorsById };
}

export async function assignDesignatedWallets(state: State): Promise<State> {
  const sponsorsById: { [id: string]: SponsorAccount } = {};
  for (const configSponsor of state.config.sponsors) {
    const sponsor = state.sponsorsById[configSponsor.id];
    const designatedAirnodeNames = Object.keys(configSponsor.airnodes);

    const designatedWallets: DesignatedWallet[] = designatedAirnodeNames.map((airnodeName) => {
      const airnode = state.airnodesByName[airnodeName];
      const wallet = getDesignatedWallet(
        airnode.mnemonic, // Here we have access to airnode wallet mnemonic but in real life a sponsor will only have access to the xpub
        state.provider,
        sponsor.address
      );
      return {
        address: wallet.address,
        airnodeName: airnodeName,
        wallet,
      };
    });

    sponsorsById[configSponsor.id] = { ...sponsor, designatedWallets };
  }

  return { ...state, sponsorsById };
}
