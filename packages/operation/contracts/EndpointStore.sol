// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IEndpointStore.sol";
import "./ProviderStore.sol";


/// @title The contract where the endpoints are stored
/// @notice This contract is used by the provider admin to associate their
/// endpoints with authorization policies, which both the oracle node and the
/// requester can check to verify authorization.
contract EndpointStore is ProviderStore, IEndpointStore {
    mapping(bytes32 => mapping(bytes32 => address[])) private providerIdToEndpointIdToAuthorizers;


    /// @notice Updates the endpoint authorizers of a provider
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID
    /// @param authorizers Authorizer contract addresses
    function updateEndpointAuthorizers(
        bytes32 providerId,
        bytes32 endpointId,
        address[] calldata authorizers
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providerIdToEndpointIdToAuthorizers[providerId][endpointId] = authorizers;
        emit EndpointUpdated(
            providerId,
            endpointId,
            authorizers
            );
    }

    /// @notice Retrieves the endpoint parameters addressed by the ID
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID
    /// @return authorizers Authorizer contract addresses
    function getEndpointAuthorizers(
        bytes32 providerId,
        bytes32 endpointId
        )
        external
        view
        override
        returns(address[] memory authorizers)
    {
        authorizers = providerIdToEndpointIdToAuthorizers[providerId][endpointId];
    }
}
