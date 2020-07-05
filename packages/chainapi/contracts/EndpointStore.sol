// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./ProviderStore.sol";


/// @title The contract where the endpoints are stored
/// @notice The main use of this contract is to associate an endpoint with
/// a set of authorizer contracts
contract EndpointStore is ProviderStore {
    struct Endpoint {
        bytes32 providerId;
        bytes32 apiId;
        address[] authorizers;
        }

    mapping(bytes32 => Endpoint) private endpoints;
    uint256 private noEndpoint = 0;

    event EndpointCreated(
        bytes32 indexed id,
        bytes32 providerId,
        bytes32 apiId,
        address[] authorizers
        );

    event EndpointUpdated(
        bytes32 indexed id,
        bytes32 providerId,
        bytes32 apiId,
        address[] authorizers
        );

    /// @notice Creates an endpoint with the given parameters, addressable by
    /// the ID it returns
    /// @dev apiId is used by Authorizer contracts to treat all endpoints from
    /// the same API the same. If you will not be using them, you can give
    /// an arbitrary value to apiId.
    /// @param providerId Provider ID from ProviderStore
    /// @param apiId API ID
    /// @param authorizers Authorizer contract addresses
    /// @return endpointId Endpoint ID
    function createEndpoint(
        bytes32 providerId,
        bytes32 apiId,
        address[] calldata authorizers
        )
        external
        onlyProviderAdmin(providerId)
        returns(bytes32 endpointId)
    {
        endpointId = keccak256(abi.encodePacked(
            noEndpoint++,
            this,
            uint256(0)
            ));
        endpoints[endpointId] = Endpoint({
            providerId: providerId,
            apiId: apiId,
            authorizers: authorizers
        });
        emit EndpointCreated(
            endpointId,
            providerId,
            apiId,
            authorizers
            );
    }

    /// @notice Updates the authorizer contracts of an endpoint
    /// @param endpointId Endpoint ID
    /// @param apiId API ID
    /// @param authorizers Authorizer contract addresses
    function updateEndpoint(
        bytes32 endpointId,
        bytes32 apiId,
        address[] calldata authorizers
        )
        external
        onlyProviderAdmin(endpoints[endpointId].providerId)
    {
        endpoints[endpointId].apiId = apiId;
        endpoints[endpointId].authorizers = authorizers;
        emit EndpointUpdated(
            endpointId,
            endpoints[endpointId].providerId,
            apiId,
            authorizers
            );
    }

    /// @notice Retrieves endpoint parameters addressed by the ID
    /// @param endpointId Endpoint ID
    /// @return providerId Provider ID from ProviderStore
    /// @return apiId API ID
    /// @return authorizers Authorizer contract addresses
    function getEndpoint(bytes32 endpointId)
        external
        view
        returns(
            bytes32 providerId,
            bytes32 apiId,
            address[] memory authorizers
        )
    {
        providerId = endpoints[endpointId].providerId;
        apiId = endpoints[endpointId].apiId;
        authorizers = endpoints[endpointId].authorizers;
    }
}
