// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeEndpointFeeRegistryReader.sol";

contract AirnodeEndpointFeeRegistryReader is IAirnodeEndpointFeeRegistryReader {
    /// @notice AirnodeEndpointFeeRegistry contract address
    address public immutable override airnodeEndpointFeeRegistry;

    /// @param _airnodeEndpointFeeRegistry AirnodeFeeRegistry contract address
    constructor(address _airnodeEndpointFeeRegistry) {
        require(
            _airnodeEndpointFeeRegistry != address(0),
            "Zero fee registry address"
        );
        airnodeEndpointFeeRegistry = _airnodeEndpointFeeRegistry;
    }
}
