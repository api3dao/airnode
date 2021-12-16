// NOTE: This file is referenced as a pathGroup pattern in .eslintrc (import/order)

import { AirnodeRrp } from '@api3/airnode-protocol';
import { BigNumber, ethers } from 'ethers';
import { BASE_FEE_MULTIPLIER, PRIORITY_FEE } from '../src/constants';

type AirnodeRrpMocks = { readonly [key in keyof InstanceType<typeof AirnodeRrp>['functions']]: jest.Mock };
type MockProps = {
  readonly airnodeRrpMocks?:
    | Partial<AirnodeRrpMocks>
    | { readonly callStatic: Partial<AirnodeRrpMocks> }
    | { readonly estimateGas: Partial<AirnodeRrpMocks> };
  readonly ethersMocks?: any; // it's OK to be with typing lenient here
};

/**
 * Mocks ethers library and AirnodeRrpFactory (from @api3/airnode-protocol) to return contract
 * with mocked functions which are passed as arguments.
 */
export function mockEthers({ airnodeRrpMocks = {}, ethersMocks = {} }: MockProps) {
  // Mocks the Contract constructor to return contract with mocked functions (specified via
  // `airnodeRrpMocks`)
  jest.mock('ethers', () => ({
    ...jest.requireActual('ethers'),
    ethers: {
      ...jest.requireActual('ethers').ethers,
      Contract: jest.fn().mockImplementation(() => airnodeRrpMocks),
      ...ethersMocks,
    },
  }));

  // AirnodeRrpFactory requires ethers under the hood using `require` and jest is unable to mock it
  // so we have to mock it in the protocol package
  jest.mock('@api3/airnode-protocol', () => {
    return {
      ...jest.requireActual<any>('@api3/airnode-protocol'),
      AirnodeRrpFactory: {
        ...jest.requireActual<any>('@api3/airnode-protocol').AirnodeRrpFactory,
        connect: jest.requireMock('ethers').ethers.Contract,
      },
    };
  });
}

/**
 * Creates and mocks gas pricing-related resources based on txType.
 */
export const createAndMockGasTarget = (txType: 'legacy' | 'eip1559') => {
  const gasPriceSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getGasPrice');
  const blockSpy = jest.spyOn(ethers.providers.JsonRpcProvider.prototype, 'getBlock');
  if (txType === 'legacy') {
    const gasPrice = ethers.BigNumber.from(1000);
    gasPriceSpy.mockResolvedValue(gasPrice);
    return { gasTarget: { gasPrice }, blockSpy, gasPriceSpy };
  }

  const baseFeePerGas = ethers.BigNumber.from(1000);
  blockSpy.mockResolvedValue({ baseFeePerGas } as ethers.providers.Block);
  const maxPriorityFeePerGas = BigNumber.from(PRIORITY_FEE);
  const maxFeePerGas = baseFeePerGas.mul(BASE_FEE_MULTIPLIER).add(maxPriorityFeePerGas);

  return { gasTarget: { maxPriorityFeePerGas, maxFeePerGas }, blockSpy, gasPriceSpy };
};
