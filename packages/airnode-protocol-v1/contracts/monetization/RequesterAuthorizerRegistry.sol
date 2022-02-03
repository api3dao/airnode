// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../utils/AddressRegistry.sol";
import "./interfaces/IRequesterAuthorizerRegistry.sol";

/// @title Registry for addresses of RequesterAuthorizer contracts dedicated to
/// chains
contract RequesterAuthorizerRegistry is
    AddressRegistry,
    IRequesterAuthorizerRegistry
{
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        AddressRegistry(_accessControlRegistry, _adminRoleDescription, _manager)
    {}

    /// @notice Called by registrars or the manager to register the
    /// RequesterAuthorizer with the chain ID
    /// @dev The RequesterAuthorizer for the chain can be registered only once
    /// @param chainId Chain ID
    /// @param requesterAuthorizer RequesterAuthorizer contract address
    function registerChainRequesterAuthorizer(
        uint256 chainId,
        address requesterAuthorizer
    ) external override onlyRegistrarOrManager {
        require(chainId != 0, "Chain ID zero");
        (bool success, ) = tryReadChainRequesterAuthorizer(chainId);
        require(!success, "Chain Authorizer already set");
        _registerAddress(
            keccak256(abi.encodePacked(chainId)),
            requesterAuthorizer
        );
        emit RegisteredChainRequesterAuthorizer(
            chainId,
            requesterAuthorizer,
            msg.sender
        );
    }

    /// @notice Returns if there is a registered RequesterAuthorizer address
    /// for the chain ID and what it is
    /// @param chainId Chain ID
    /// @return success If the RequesterAuthorizer was registered
    /// @return requesterAuthorizer Registered address
    function tryReadChainRequesterAuthorizer(uint256 chainId)
        public
        view
        override
        returns (bool success, address requesterAuthorizer)
    {
        (success, requesterAuthorizer) = tryReadRegisteredAddress(
            keccak256(abi.encodePacked(chainId))
        );
    }
}
