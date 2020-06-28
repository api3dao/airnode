// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./ProviderStore.sol";


/// @title The contract where the endpoints are stored
/// @notice The main use of this contract is to associate an endpoint with
/// a set of authorizer contracts.
contract EndpointStore is ProviderStore {
    struct Endpoint {
        bytes32 providerId;
        address[] authorizers;
    }

    mapping(bytes32 => Endpoint) private endpoints;
    uint256 private noEndpoint = 0;

    event EndpointCreated(bytes32 indexed id);
    event EndpointUpdated(bytes32 indexed id);
    event EndpointDeleted(bytes32 indexed id);

    /// @notice Creates an endpoint with the given parameters, addressable by
    /// the ID it returns
    /// @param providerId Provider ID
    /// @param authorizers Authorizer contract addresses
    /// @return endpointId Endpoint ID
    function createEndpoint(
        bytes32 providerId,
        address[] calldata authorizers
        )
        external
        onlyProviderAdmin(providerId)
        returns(bytes32 endpointId)
    {
        endpointId = keccak256(abi.encodePacked(noEndpoint++, this));
        endpoints[endpointId] = Endpoint({
            providerId: providerId,
            authorizers: authorizers
        });
        emit EndpointCreated(endpointId);
    }

    /// @notice Updates the authorizer contracts of an endpoint
    /// @param endpointId Endpoint ID
    /// @param authorizers Authorizer contract addresses
    function updateEndpointAuthorizers(
        bytes32 endpointId,
        address[] calldata authorizers
        )
        external
        onlyProviderAdmin(endpoints[endpointId].providerId)
    {
        endpoints[endpointId].authorizers = authorizers;
        emit EndpointUpdated(endpointId);
    }

    /// @notice Deletes the endpoint
    /// @param endpointId Endpoint ID
    function deleteEndpoint(bytes32 endpointId)
        external
        onlyProviderAdmin(endpoints[endpointId].providerId)
    {
        delete endpoints[endpointId];
        emit EndpointDeleted(endpointId);
    }

    /// @notice Retrieves endpoint parameters addressed by the ID
    /// @param endpointId Endpoint ID
    /// @return providerId Provider ID
    /// @return authorizers Authorizer contract addresses
    function getEndpoint(bytes32 endpointId)
        external
        view
        returns(
            bytes32 providerId,
            address[] memory authorizers
        )
    {
        providerId = endpoints[endpointId].providerId;
        authorizers = endpoints[endpointId].authorizers;
    }
}
