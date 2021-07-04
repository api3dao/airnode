import { ethers } from 'ethers';
import { deriveExtendedPublicKey, deriveWalletFromPath } from '../utils';
import { Airnode, DeployState as State, RequesterAccount } from '../../types';

export async function assignAirnodeAccounts(state: State): Promise<State> {
  // eslint-disable-next-line functional/prefer-readonly-type
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
  const { AirnodeRrp } = state.contracts;

  // eslint-disable-next-line functional/prefer-readonly-type
  const requestersById: { [id: string]: RequesterAccount } = {};
  for (const configRequester of state.config.requesters) {
    const requesterWallet = ethers.Wallet.createRandom().connect(state.provider);
    const requesterAddress = requesterWallet.address;

    const tx = await AirnodeRrp!.connect(state.deployer).createRequester(requesterAddress);
    await tx.wait();

    const logs = await state.provider.getLogs({
      fromBlock: 0,
      address: AirnodeRrp!.address,
    });

    const log = logs.find((log) => log.transactionHash === tx.hash);
    const parsedLog = AirnodeRrp!.interface.parseLog(log!);
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
  // eslint-disable-next-line functional/prefer-readonly-type
  const requestersById: { [id: string]: RequesterAccount } = {};
  for (const configRequester of state.config.requesters) {
    const requester = state.requestersById[configRequester.id];
    const designatedAirnodeNames = Object.keys(configRequester.airnodes);

    const designatedWallets = designatedAirnodeNames.map((airnodeName) => {
      const airnode = state.airnodesByName[airnodeName];
      const wallet = deriveWalletFromPath(airnode.mnemonic, `m/0/${requester.requesterIndex}`, state.provider);
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
