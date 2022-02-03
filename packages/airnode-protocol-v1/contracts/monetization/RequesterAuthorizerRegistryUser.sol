// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IRequesterAuthorizerRegistry.sol";
import "./interfaces/IRequesterAuthorizerRegistryUser.sol";

/// @title Contract that should be inherited by contracts that will interact
/// with RequesterAuthorizerRegistry
contract RequesterAuthorizerRegistryUser is IRequesterAuthorizerRegistryUser {
    /// @notice RequesterAuthorizerRegistry contract address
    address public immutable override requesterAuthorizerRegistry;

    /// @param _requesterAuthorizerRegistry RequesterAuthorizerRegistry contract address
    constructor(address _requesterAuthorizerRegistry) {
        require(
            _requesterAuthorizerRegistry != address(0),
            "Authorizer registry address zero"
        );
        requesterAuthorizerRegistry = _requesterAuthorizerRegistry;
    }
}
