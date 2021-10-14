// NOTE: This file is referenced as a pathGroup pattern in .eslintrc (import/order)

import { AirnodeRrp } from '@api3/protocol';

type AirnodeRrpMocks = { readonly [key in keyof InstanceType<typeof AirnodeRrp>['functions']]: jest.Mock };
type MockProps = {
  readonly airnodeRrpMocks?:
    | Partial<AirnodeRrpMocks>
    | { readonly callStatic: Partial<AirnodeRrpMocks> }
    | { readonly estimateGas: Partial<AirnodeRrpMocks> };
  readonly ethersMocks?: any; // it's OK to be with typing lenient here
};

/**
 * Mocks ethers library and AirnodeRrpFactory (from @api3/protocol) to return contract
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
  jest.mock('@api3/protocol', () => {
    return {
      ...jest.requireActual<any>('@api3/protocol'),
      AirnodeRrpFactory: {
        ...jest.requireActual<any>('@api3/protocol').AirnodeRrpFactory,
        connect: jest.requireMock('ethers').ethers.Contract,
      },
    };
  });
}
