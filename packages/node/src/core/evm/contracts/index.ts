import isEmpty from 'lodash/isEmpty';
import { Airnode } from './airnode';
import { Convenience } from './convenience';
import { ChainConfig, EVMContracts } from '../../../types';

export { Airnode, Convenience };

// NOTE: The user cannot specify options for EVM mainnet. These contracts are hardcoded to prevent
// potential exploits
export const EVM_PROTECTED_CHAIN_IDS = [1];
export const EVM_REQUIRED_CONTRACTS = ['Airnode', 'Convenience'];

export function build(chain: ChainConfig): EVMContracts {
  const evmContracts = { Airnode, Convenience };

  const contracts = EVM_REQUIRED_CONTRACTS.reduce((acc, name) => {
    // If no options or contract overrides were specified, take the defaults for each known chain ID
    if (!chain.contracts) {
      const defaultAddress = evmContracts[name].addresses[chain.id];
      return { ...acc, [name]: defaultAddress };
    }

    const overrideAddress = chain.contracts[name];
    // If no contract override was found, take the default
    if (!overrideAddress) {
      const defaultAddress = evmContracts[name].addresses[chain.id];
      return { ...acc, [name]: defaultAddress };
    }

    if (EVM_PROTECTED_CHAIN_IDS.includes(chain.id)) {
      throw new Error(`EVM Contract:${name} cannot be overridden for protected chain ID: ${chain.id}`);
    }

    return { ...acc, [name]: overrideAddress };
  }, {}) as EVMContracts;

  return contracts;
}

export function validate(chain: ChainConfig): string[] {
  if (!chain.contracts) {
    return [];
  }

  if (EVM_PROTECTED_CHAIN_IDS.includes(chain.id) && !isEmpty(chain.contracts)) {
    return [`Contracts cannot be specified for protected chain ID: ${chain.id}`];
  }

  const missingAddresses = Object.keys(chain.contracts).reduce((acc, name) => {
    const overrideAddress = chain.contracts![name];
    if (!overrideAddress || !overrideAddress.startsWith('0x')) {
      return [
        ...acc,
        `A valid EVM contract address is required for ${name}. Provided: ${overrideAddress} (chain ID: ${chain.id})`,
      ];
    }
    return acc;
  }, []);

  return missingAddresses;
}
