// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeFeeRegistryClient.sol";

contract AirnodeFeeRegistryClient is IAirnodeFeeRegistryClient {
    /// @notice Address of the AirnodeFeeRegistry contract that keeps the price
    /// of airnode endpoints across different chains
    address public override airnodeFeeRegistry;

    /// @param _airnodeFeeRegistry AirnodeFeeRegistry contract address
    constructor(address _airnodeFeeRegistry) {
        require(_airnodeFeeRegistry != address(0), "Zero address");
        airnodeFeeRegistry = _airnodeFeeRegistry;
    }
}
