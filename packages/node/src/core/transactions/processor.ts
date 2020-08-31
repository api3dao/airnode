import { deriveWalletFromIndex, getGasPrice } from '../ethereum';
import { ProviderState } from '../../types';

export async function submit(state: ProviderState) {
  const gasPrice = await getGasPrice(state);

  const { xpub } = state;

  const walletIndices = Object.keys(state.walletDataByIndex);
  const walletAddressesByIndex = walletIndices.reduce((acc, index) => {
    const address = deriveWalletFromIndex(xpub, index);
    return { ...acc, [index]: address };
  }, {});

  return { gasPrice, walletAddressesByIndex };
}
