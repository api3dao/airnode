import { Aggregator, getContractInterface } from './aggregator';

describe('Aggregator', () => {
  it('exposes the addresses for each network', () => {
    expect(Aggregator.addresses).toEqual({
      1: '<TODO>',
      3: '<TODO>',
    });
  });

  it('exposes the contract ABI', () => {
    expect(Aggregator.ABI).toEqual([
      'event NewRequest(address indexed requester, uint256 requestInd)',
      'event RequestFulfilled(address indexed fulfiller, uint256 requestInd)',
    ]);
  });
});

describe('getContractInterface', () => {
  it('returns the contract interface', () => {
    expect(getContractInterface()).toEqual({
      _abiCoder: { coerceFunc: null },
      _isInterface: true,
      deploy: {
        _isFragment: true,
        gas: null,
        inputs: [],
        name: null,
        payable: false,
        stateMutability: 'nonpayable',
        type: 'constructor',
      },
      errors: {},
      events: {
        'NewRequest(address,uint256)': {
          _isFragment: true,
          anonymous: false,
          inputs: [
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'address',
              components: null,
              indexed: true,
              name: 'requester',
              type: 'address',
            },
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'uint256',
              components: null,
              indexed: null,
              name: 'requestInd',
              type: 'uint256',
            },
          ],
          name: 'NewRequest',
          type: 'event',
        },
        'RequestFulfilled(address,uint256)': {
          _isFragment: true,
          anonymous: false,
          inputs: [
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'address',
              components: null,
              indexed: true,
              name: 'fulfiller',
              type: 'address',
            },
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'uint256',
              components: null,
              indexed: null,
              name: 'requestInd',
              type: 'uint256',
            },
          ],
          name: 'RequestFulfilled',
          type: 'event',
        },
      },
      fragments: [
        {
          _isFragment: true,
          anonymous: false,
          inputs: [
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'address',
              components: null,
              indexed: true,
              name: 'requester',
              type: 'address',
            },
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'uint256',
              components: null,
              indexed: null,
              name: 'requestInd',
              type: 'uint256',
            },
          ],
          name: 'NewRequest',
          type: 'event',
        },
        {
          _isFragment: true,
          anonymous: false,
          inputs: [
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'address',
              components: null,
              indexed: true,
              name: 'fulfiller',
              type: 'address',
            },
            {
              _isParamType: true,
              arrayChildren: null,
              arrayLength: null,
              baseType: 'uint256',
              components: null,
              indexed: null,
              name: 'requestInd',
              type: 'uint256',
            },
          ],
          name: 'RequestFulfilled',
          type: 'event',
        },
      ],
      functions: {},
      structs: {},
    });
  });
});
