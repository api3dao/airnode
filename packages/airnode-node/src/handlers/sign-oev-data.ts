import { ethers } from 'ethers';
import { go } from '@api3/promise-utils';
import { SignOevDataResponse } from '../types';
import { getAirnodeWalletFromPrivateKey } from '../evm/wallet';
// TODO: define in a better place
import { Beacon } from '../workers/local-gateways';
import { getExpectedTemplateIdV1 } from '../evm/templates';

export async function signOevData(
  signedData: Beacon[],
  oevUpdateHash: string
): Promise<[Error, null] | [null, SignOevDataResponse]> {
  const airnodeWallet = getAirnodeWalletFromPrivateKey();
  const airnodeAddress = airnodeWallet.address;

  const beaconsWithTemplateId = signedData.map((beacon) => {
    const templateId = getExpectedTemplateIdV1({
      airnodeAddress: beacon.airnodeAddress,
      endpointId: beacon.endpointId,
      encodedParameters: beacon.encodedParameters,
    });

    return { ...beacon, templateId };
  });
  const beaconsToSign = beaconsWithTemplateId.filter((beacon) => beacon.airnodeAddress === airnodeAddress);
  const goSignatures = await go(() =>
    Promise.all(
      beaconsToSign.map((beacon) =>
        airnodeWallet.signMessage(
          ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [oevUpdateHash, beacon.templateId])
        )
      )
    )
  );
  if (!goSignatures.success) {
    return [new Error(`Can't sign the data: ${goSignatures.error}`), null];
  }
  const signatures = goSignatures.data;

  return [
    null,
    {
      success: true,
      data: signatures,
    },
  ];
}
