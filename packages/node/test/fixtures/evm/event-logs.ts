import { ethers } from 'ethers';

type Log = ethers.providers.Log;

// =================================================================
// Template requests
// =================================================================
export function buildMadeTemplateRequest(overrides?: Partial<Log>): Log {
  return {
    blockNumber: 11,
    blockHash: '0xf7d82afd06c60e84e5ff9396c7583a397e15c285cc262a893b4672fb237a926f',
    transactionIndex: 0,
    removed: false,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    data: '0x00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000007a69000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512e4a1b9c33b9dda81f38b6e84c1bf59fcf5dd197039efc34edfaa61cfeb01b217000000000000000000000000641eeb15b15d8e2cfb5f9d6480b175d93c14e6b60000000000000000000000004f716a9a20d03be77753f3d3e856a5e180995eda000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f051248a4157c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000060316200000000000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
    topics: [
      '0xeb39930cdcbb560e6422558a2468b93a215af60063622e63cbb165eba14c3203',
      '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
      '0x0cde2637ece0845ecbb7d59e38f2679960455459830007f11994e05595808147',
    ],
    transactionHash: '0x41017e353b771d7a3b061e229359e6f18a1fb889ce8af184a05df12eed7d7a06',
    logIndex: 0,
    ...overrides,
  };
}

export function buildTemplateFulfilledRequest(overrides?: Partial<Log>): Log {
  return {
    blockNumber: 20,
    blockHash: '0x42264bc78c914bbdc0b7e0acb8da1a2be12ba1dc8fcb75a49116784d43d93412',
    transactionIndex: 0,
    removed: false,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    data: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000043',
    topics: [
      '0xd1cc11d12363af4b6022e66d14b18ba1779ecd85a5b41891349d530fb6eee066',
      '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
      '0x0cde2637ece0845ecbb7d59e38f2679960455459830007f11994e05595808147',
    ],
    transactionHash: '0xb5e91680be948547b6959031040b3995348e33538a547859c12e2371cd7848a4',
    logIndex: 0,
    ...overrides,
  };
}

// =================================================================
// Full requests
// =================================================================
export function buildMadeFullRequest(overrides?: Partial<Log>): Log {
  return {
    blockNumber: 12,
    blockHash: '0x40a1a0b36d09655b64b15ca702821c95ecdd4c5d91d726512aae88242e62af51',
    transactionIndex: 0,
    removed: false,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    data: '0x00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000007a69000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512eddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353000000000000000000000000212b5e1221057415074541852f1d4d9337bf9ca6000000000000000000000000b9f90b475f30c2cb0985b4e262de85d92fbba52a000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f051248a4157c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000160316262626262000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
    topics: [
      '0x3a52c462346de2e9436a3868970892956828a11b9c43da1ed43740b12e1125ae',
      '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
      '0x9d3dec7d5f8da8e6d1a7d4220ef18719a693b30a2007898637d8fb4412e627db',
    ],
    transactionHash: '0xa4a35012384274d8d7b470f72c5fc3d713faa145d327999d037a4f0fcb3eaa0f',
    logIndex: 0,
    ...overrides,
  };
}

export function buildFullFulfilledRequest(overrides?: Partial<Log>): Log {
  return {
    blockNumber: 21,
    blockHash: '0xc7b5393a877e8bd1cb3bc44e9dde29fbe2c3c2e9df022d1277ca4e97505a07f2',
    transactionIndex: 0,
    removed: false,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    data: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000043',
    topics: [
      '0xd1cc11d12363af4b6022e66d14b18ba1779ecd85a5b41891349d530fb6eee066',
      '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
      '0xd1984b7f40c4b5484b756360f56a41cb7ee164d8acd0e0f18f7a0bbf5a353e65',
    ],
    transactionHash: '0xf731d66caaaf31565716d7a6f626def0584b8e3771a07739ddf3f676b5ec93da',
    logIndex: 0,
    ...overrides,
  };
}

// =================================================================
// Withdrawals
// =================================================================
export function buildRequestedWithdrawal(overrides?: Partial<Log>): Log {
  return {
    blockNumber: 13,
    blockHash: '0xbcd98c42914d4a100ac7f96b253dec5b38c8c60524da7a792b58ffd787b8d592',
    transactionIndex: 0,
    removed: false,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    data: '0x00000000000000000000000046195a88814af86b4cc7e550841f9b942fff9e30',
    topics: [
      '0xd48d52c7c6d0c940f3f8d07591e1800ef3a70daf79929a97ccd80b4494769fc7',
      '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
      '0x00000000000000000000000064119dae15b0c1972a2c1dbbc1f435c78e121460',
      '0x4a6d3c568729d35c367ba5c5881e31d75da605beaa03c04c7a463419b528847d',
    ],
    transactionHash: '0x4210f2e79ed99ed7f870011439bc9324f02227d8d057b779557a342ae99db1b1',
    logIndex: 0,
    ...overrides,
  };
}

export function buildFulfilledWithdrawal(overrides?: Partial<Log>): Log {
  return {
    blockNumber: 22,
    blockHash: '0x10036d3cc8f54317033f529627280652129644ce01301a5856d82219bd4250be',
    transactionIndex: 0,
    removed: false,
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    data: '0x00000000000000000000000046195a88814af86b4cc7e550841f9b942fff9e300000000000000000000000006812efaf684aa899949212a2a6785305ec0f1474',
    topics: [
      '0xadb4840bbd5f924665ae7e0e0c83de5c0fb40a98c9b57dba53a6c978127a622e',
      '0x000000000000000000000000a30ca71ba54e83127214d3271aea8f5d6bd4dace',
      '0x00000000000000000000000064119dae15b0c1972a2c1dbbc1f435c78e121460',
      '0x4a6d3c568729d35c367ba5c5881e31d75da605beaa03c04c7a463419b528847d',
    ],
    transactionHash: '0xd7018b960a11f53e83763b2a3c582b5e9178caf24fe0e17e3d3367962af8885f',
    logIndex: 0,
    ...overrides,
  };
}
