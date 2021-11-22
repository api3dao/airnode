// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IAirnodeRequesterAuthorizerRegistryClient.sol";

contract AirnodeRequesterAuthorizerRegistryClient is
    IAirnodeRequesterAuthorizerRegistryClient
{
    /// @notice Address of the AirnodeRequesterAuthorizerRegistry contract that keeps the
    /// RequesterAuthorizerWithManager addresses for different chains.
    address public immutable override airnodeRequesterAuthorizerRegistry;

    /// @param _airnodeRequesterAuthorizerRegistry AirnodeRequesterAuthorizerRegistry contract address
    constructor(address _airnodeRequesterAuthorizerRegistry) {
        require(
            _airnodeRequesterAuthorizerRegistry != address(0),
            "Zero address"
        );
        airnodeRequesterAuthorizerRegistry = _airnodeRequesterAuthorizerRegistry;
    }
}
