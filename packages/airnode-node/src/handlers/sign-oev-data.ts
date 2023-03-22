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
  const goSignedBeacons = await go(() =>
    Promise.all(
      beaconsToSign.map(async (beacon) => {
        return {
          beaconId: beacon.beaconId,
          signature: await airnodeWallet.signMessage(
            ethers.utils.arrayify(
              ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [oevUpdateHash, beacon.templateId])
            )
          ),
        };
      })
    )
  );
  if (!goSignedBeacons.success) {
    return [new Error(`Can't sign the data: ${goSignedBeacons.error}`), null];
  }
  const signedBeacons = goSignedBeacons.data;

  return [
    null,
    {
      success: true,
      data: signedBeacons.reduce((acc, { beaconId, signature }) => {
        return { ...acc, [beaconId]: signature };
      }, {} as SignOevDataResponse['data']),
    },
  ];
}
