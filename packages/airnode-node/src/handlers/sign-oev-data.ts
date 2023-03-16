import { ethers } from 'ethers';
import { go } from '@api3/promise-utils';
import { SignOevDataResponse } from '../types';
import { getAirnodeWalletFromPrivateKey } from '../evm/wallet';
import { ProcessSignOevDataRequestBody } from '../workers/local-gateways';
import { getExpectedTemplateIdV1 } from '../evm/templates';

export function deriveBeaconId(airnodeAddress: string, templateId: string) {
  return ethers.utils.solidityKeccak256(['address', 'bytes32'], [airnodeAddress, templateId]);
}

export function deriveBeaconSetId(beaconIds: string[]) {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32[]'], [beaconIds]));
}

export function calculateMedian(arr: ethers.BigNumber[]) {
  const mid = Math.floor(arr.length / 2);
  const nums = [...arr].sort((a, b) => {
    if (a.lt(b)) return -1;
    else if (a.gt(b)) return 1;
    else return 0;
  });
  return arr.length % 2 !== 0 ? nums[mid] : nums[mid - 1].add(nums[mid]).div(2);
}

export const calculateUpdateTimestamp = (timestamps: string[]) => {
  const accumulatedTimestamp = timestamps.reduce((total, next) => total + parseInt(next, 10), 0);
  return Math.floor(accumulatedTimestamp / timestamps.length);
};

export async function signOevData(
  requestBody: ProcessSignOevDataRequestBody,
  validUpdateValues: ethers.BigNumber[],
  validUpdateTimestamps: string[]
): Promise<[Error, null] | [null, SignOevDataResponse]> {
  const { chainId, dapiServerAddress, oevProxyAddress, updateId, bidderAddress, bidAmount, signedData } = requestBody;
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
  const beaconIds = beaconsWithTemplateId.map((beacon) => deriveBeaconId(beacon.airnodeAddress, beacon.templateId));
  // We are computing both update value and data feed ID in Airnode otherwise it would be possible to spoof the signature.
  const dataFeedId = beaconIds.length === 1 ? beaconIds[0] : deriveBeaconSetId(beaconIds);
  const timestamp = calculateUpdateTimestamp(validUpdateTimestamps);
  const updateValue = calculateMedian(validUpdateValues);
  const encodedUpdateValue = ethers.utils.defaultAbiCoder.encode(['int256'], [updateValue]);
  const oevUpdateHash = ethers.utils.solidityKeccak256(
    ['uint256', 'address', 'address', 'bytes32', 'bytes32', 'uint256', 'bytes', 'address', 'uint256'],
    [
      chainId,
      dapiServerAddress,
      oevProxyAddress,
      dataFeedId,
      updateId,
      timestamp,
      encodedUpdateValue,
      bidderAddress,
      bidAmount,
    ]
  );

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
      data: signatures.map((signature) => ({
        signature,
      })),
    },
  ];
}
