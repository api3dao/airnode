import { ethers } from 'ethers';
import { Airnode, DeployState as State, SponsorWallet, SponsorAccount } from '../../types';
import { deriveExtendedPublicKey, deriveWalletFromMnemonic, getSponsorWallet } from '../utils';

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
      sponsorWallets: [],
      signer: sponsorWallet,
    };
  }

  return { ...state, sponsorsById };
}

export async function assignSponsorWallets(state: State): Promise<State> {
  const sponsorsById: { [id: string]: SponsorAccount } = {};
  for (const configSponsor of state.config.sponsors) {
    const sponsor = state.sponsorsById[configSponsor.id];
    const airnodeNames = Object.keys(configSponsor.airnodes);

    const sponsorWallets: SponsorWallet[] = airnodeNames.map((airnodeName) => {
      const airnode = state.airnodesByName[airnodeName];
      const wallet = getSponsorWallet(
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

    sponsorsById[configSponsor.id] = { ...sponsor, sponsorWallets };
  }

  return { ...state, sponsorsById };
}
