import { HardhatUserConfig, subtask } from 'hardhat/config';
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from 'hardhat/builtin-tasks/task-names';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import { HardhatRuntimeEnvironment, RunSuperFunction } from 'hardhat/types';

export const customCompiler = async (
  args: { readonly solcVersion: string },
  hre: HardhatRuntimeEnvironment,
  next: RunSuperFunction<{ readonly solcVersion: string }>
) => {
  if (args.solcVersion === '0.8.9') {
    const compilerPath = '/root/.cache/hardhat-nodejs/compilers/wasm/soljson-v0.8.9+commit.e5eed63a.js';

    return {
      compilerPath,
      isSolcJs: true,
      version: args.solcVersion,
      longVersion: '0.8.9+commit.e5eed63a',
    };
  }

  return next();
};

/**
 * This overrides the standard compiler version to use a custom compiled version.
 */
subtask<{ readonly solcVersion: string }>(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, customCompiler);

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  paths: {
    tests: 'e2e',
  },
};

export default config;
