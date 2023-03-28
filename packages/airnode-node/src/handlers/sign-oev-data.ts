import { ethers } from 'ethers';
import { go } from '@api3/promise-utils';
import { SignOevDataResponse } from '../types';
import { getAirnodeWalletFromPrivateKey } from '../evm/wallet';
// TODO: define in a better place
import { BeaconWithIds } from '../workers/local-gateways';

export async function signOevData(
  beacons: BeaconWithIds[],
  oevUpdateHash: string
): Promise<[Error, null] | [null, SignOevDataResponse]> {
  const airnodeWallet = getAirnodeWalletFromPrivateKey();
  const airnodeAddress = airnodeWallet.address;

  const beaconsToSign = beacons.filter((beacon) => beacon.airnodeAddress === airnodeAddress);
  const goSignatures = await go(() =>
    Promise.all(
      beaconsToSign.map((beacon) => {
        return airnodeWallet.signMessage(
          ethers.utils.arrayify(
            ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [oevUpdateHash, beacon.templateId])
          )
        );
      })
    )
  );
  if (!goSignatures.success) {
    return [new Error(`Can't sign the data: ${goSignatures.error}`), null];
  }

  return [
    null,
    {
      success: true,
      data: goSignatures.data,
    },
  ];
}
