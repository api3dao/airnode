// import isEmpty from 'lodash/isEmpty';
import { ethers } from 'ethers';
import { deriveExtendedPublicKey, deriveWalletFromPath } from '../utils';
import { APIProvider, DeployState as State, RequesterAccount } from '../../types';

export async function assignProviderAccounts(state: State): Promise<State> {
  const apiProvidersByName: { [name: string]: APIProvider } = {};
  for (const providerName of Object.keys(state.config.apiProviders)) {
    const apiProvider = state.config.apiProviders[providerName];
    const providerWallet = deriveWalletFromPath(apiProvider.mnemonic, 'm', state.provider);
    const xpub = deriveExtendedPublicKey(apiProvider.mnemonic);

    apiProvidersByName[providerName] = {
      address: providerWallet.address,
      mnemonic: apiProvider.mnemonic,
      signer: providerWallet,
      xpub,
    };
  }
  return { ...state, apiProvidersByName };
}

export async function assignRequesterAccounts(state: State): Promise<State> {
  const { Airnode } = state.contracts;

  const requestersById: { [id: string]: RequesterAccount } = {};
  for (const configRequester of state.config.requesters) {
    const requesterWallet = ethers.Wallet.createRandom().connect(state.provider);
    const requesterAddress = requesterWallet.address;

    const tx = await Airnode!.connect(state.deployer).createRequester(requesterAddress);
    await tx.wait();

    const logs = await state.provider.getLogs({
      fromBlock: 0,
      address: Airnode!.address,
    });

    const log = logs.find((log) => log.transactionHash === tx.hash);
    const parsedLog = Airnode!.interface.parseLog(log!);
    const requesterIndex = parsedLog.args.requesterIndex;

    requestersById[configRequester.id] = {
      address: requesterAddress,
      designatedWallets: [],
      requesterIndex,
      signer: requesterWallet,
    };
  }

  return { ...state, requestersById };
}

export async function assignDesignatedWallets(state: State) {
  const requestersById: { [id: string]: RequesterAccount } = {};
  for (const configRequester of state.config.requesters) {
    const requester = state.requestersById[configRequester.id];
    const designatedProviderNames = Object.keys(configRequester.apiProviders);

    const designatedWallets = designatedProviderNames.map((providerName) => {
      const apiProvider = state.apiProvidersByName[providerName];
      const wallet = deriveWalletFromPath(apiProvider.mnemonic, `m/0/${requester.requesterIndex}`, state.provider);
      return {
        address: wallet.address,
        apiProviderName: providerName,
        wallet,
      };
    });

    requestersById[configRequester.id] = { ...requester, designatedWallets };
  }

  return { ...state, requestersById };
}
