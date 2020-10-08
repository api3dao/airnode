import isEmpty from 'lodash/isEmpty';
import { Airnode } from './airnode';
import { Convenience } from './convenience';
import { GasPriceFeed } from './gas-price-feed';
import { ChainConfig, EVMContracts } from '../../../types';

export { Airnode, Convenience, GasPriceFeed };

// NOTE: The user cannot specify options for EVM mainnet. These contracts are hardcoded to prevent
// potential exploits
export const EVM_PROTECTED_CHAIN_IDS = [1];
export const EVM_REQUIRED_CONTRACTS = ['Airnode', 'Convenience', 'GasPriceFeed'];

export function build(chain: ChainConfig): EVMContracts {
  const evmContracts = { Airnode, Convenience, GasPriceFeed };

  const contracts = EVM_REQUIRED_CONTRACTS.reduce((acc, name) => {
    // If no options or contract overrides were specified, take the defaults for each known chain ID
    if (!chain.contracts) {
      const address = evmContracts[name].addresses[chain.id];
      return { ...acc, [name]: address };
    }

    const contractOverride = chain.contracts.find((c) => c.name === name);
    // If no contract override was found, take the default
    if (!contractOverride) {
      const address = evmContracts[name].addresses[chain.id];
      return { ...acc, [name]: address };
    }

    if (EVM_PROTECTED_CHAIN_IDS.includes(chain.id)) {
      throw new Error(`EVM Contract:${name} cannot be overridden for protected chain ID: ${chain.id}`);
    }

    return { ...acc, [name]: contractOverride.address };
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

  const missingAddresses = chain.contracts.reduce((acc, contract) => {
    if (!contract.address || !contract.address.startsWith('0x')) {
      return [...acc, `A valid EVM contract address is required for ${contract.name} (chain ID: ${chain.id})`];
    }
    return acc;
  }, []);

  return missingAddresses;
}
