import { ethers } from 'ethers';
import { AirnodeRrpV0DryRun, AirnodeRrpV0DryRunFactory } from '@api3/airnode-protocol';

const FulfilledRequest = ethers.utils.id('FulfilledRequest(address,bytes32,bytes)');

const airnodeRrpDryRunTopics = {
  // API calls
  FulfilledRequest,
};

export { AirnodeRrpV0DryRunFactory, AirnodeRrpV0DryRun, airnodeRrpDryRunTopics };
