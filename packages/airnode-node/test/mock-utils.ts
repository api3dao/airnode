// NOTE: This file is referenced as a pathGroup pattern in .eslintrc (import/order)

import fs from 'fs';
import { AirnodeRrpV0 } from '@api3/airnode-protocol';
import { BigNumber, ethers } from 'ethers';
import { BASE_FEE_MULTIPLIER } from '@api3/airnode-utilities';

type AirnodeRrpMocks = { readonly [key in keyof AirnodeRrpV0['functions']]: jest.Mock };
type MockProps = {
  readonly airnodeRrpMocks?:
    | Partial<AirnodeRrpMocks>
    | { readonly callStatic: Partial<AirnodeRrpMocks> }
    | { readonly estimateGas: Partial<AirnodeRrpMocks> };
  readonly ethersMocks?: any; // it's OK to be with typing lenient here
};
type GasTargetMock = {
  gasPriceSpy: jest.SpyInstance<Promise<BigNumber>>;
  blockSpy: jest.SpyInstance<Promise<ethers.providers.Block>>;
  blockWithTransactionsSpy: jest.SpyInstance<
    Promise<ethers.providers.Block & { transactions: ethers.providers.TransactionResponse[] }>
  >;
  gasTarget: {
    type: number;
    gasPrice?: BigNumber;
    gasLimit: BigNumber;
    maxFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
  };
};

/**
 * Mocks ethers library and AirnodeRrpV0Factory (from @api3/airnode-protocol) to return contract
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

  // AirnodeRrpV0Factory requires ethers under the hood using `require` and jest is unable to mock it
  // so we have to mock it in the protocol package
  jest.mock('@api3/airnode-protocol', () => {
    return {
      ...jest.requireActual<any>('@api3/airnode-protocol'),
      AirnodeRrpV0Factory: {
        ...jest.requireActual<any>('@api3/airnode-protocol').AirnodeRrpV0Factory,
        connect: jest.requireMock('ethers').ethers.Contract,
      },
    };
  });
}

/**
 * Creates and mocks gas pricing-related resources based on txType.
 */
export const createAndMockGasTarget = (txType: 'legacy' | 'eip1559'): GasTargetMock => {
  const gasPriceSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getGasPrice');
  const blockSpy = jest.spyOn(ethers.providers.StaticJsonRpcProvider.prototype, 'getBlock');
  // Ethers does not export BlockWithTransactions so using a custom type definition to include the transactions array
  const blockWithTransactionsSpy = jest.spyOn(
    ethers.providers.StaticJsonRpcProvider.prototype,
    'getBlockWithTransactions'
  ) as unknown as jest.SpyInstance<
    Promise<ethers.providers.Block & { transactions: ethers.providers.TransactionResponse[] }>
  >;

  const gasLimit = ethers.BigNumber.from(500_000);
  const gasPrice = ethers.BigNumber.from(1_000);

  if (txType === 'legacy') {
    gasPriceSpy.mockResolvedValue(gasPrice);
    blockWithTransactionsSpy
      .mockResolvedValue({
        number: 23,
        transactions: Array(20).fill({ gasPrice }),
      } as any)
      .mockResolvedValue({
        number: 3,
        transactions: Array(20).fill({ gasPrice }),
      } as any);
    return { gasTarget: { type: 0, gasPrice, gasLimit }, blockSpy, gasPriceSpy, blockWithTransactionsSpy };
  }

  const baseFeePerGas = ethers.BigNumber.from(999);
  blockSpy.mockResolvedValue({ baseFeePerGas } as ethers.providers.Block);
  const maxPriorityFeePerGas = BigNumber.from(1);
  const maxFeePerGas = baseFeePerGas.mul(BASE_FEE_MULTIPLIER).add(maxPriorityFeePerGas);
  blockWithTransactionsSpy
    .mockResolvedValue({
      number: 23,
      baseFeePerGas,
      transactions: Array(20).fill({ maxPriorityFeePerGas, maxFeePerGas }),
    } as any)
    .mockResolvedValue({
      number: 3,
      baseFeePerGas,
      transactions: Array(20).fill({ maxPriorityFeePerGas, maxFeePerGas }),
    } as any);

  return {
    gasTarget: { type: 2, maxFeePerGas: gasPrice, maxPriorityFeePerGas: gasPrice, gasLimit },
    blockSpy,
    gasPriceSpy,
    blockWithTransactionsSpy,
  };
};

// Declare originalFs outside of mockReadFileSync to prevent infinite recursion errors in mockReadFileSync.
const originalFs = fs.readFileSync;

/**
 * Mocks the fs library if the file path includes the specified file path substring
 * and otherwise returns the original content.
 */
export const mockReadFileSync = (filePathSubstr: string, mockValue: string) => {
  return jest.spyOn(fs, 'readFileSync').mockImplementation((...args) => {
    const path = args[0].toString();
    if (path.includes(filePathSubstr)) {
      return mockValue;
    }
    return originalFs(...args);
  });
};
