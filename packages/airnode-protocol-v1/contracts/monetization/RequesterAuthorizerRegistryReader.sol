// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/IRequesterAuthorizerRegistryReader.sol";

interface IRequesterAuthorizerRegistry {
    function tryReadChainRequesterAuthorizer(uint256 chainId)
        external
        view
        returns (bool success, address requesterAuthorizer);
}

contract RequesterAuthorizerRegistryReader is
    IRequesterAuthorizerRegistryReader
{
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
