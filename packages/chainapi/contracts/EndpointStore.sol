// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./ProviderStore.sol";
import "./interfaces/AuthorizerInterface.sol";


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
    uint256 private noEndpoints = 0;

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
            noEndpoints++,
            this,
            msg.sender,
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

    /// @notice Uses authorizer contracts of an endpoint to decide if a requester
    /// is authorized to call an endpoint. Once a node receives a request, it
    /// calls this method to determine if it should respond.
    /// @dev The elements of the authorizer array are either addresses of
    /// Authorizer contracts with the interface defined as AuthorizerInterface,
    /// or 0. Say we have authorizer contracts X, Y, Z, T, and our authorizer
    /// array is [X, Y, 0, Z, T]. This means that the requester should satisfy
    /// (X AND Y) OR (Z AND T) to be considered authorized. In other words,
    /// consequent authorizer contracts need to verify authorization
    /// simultaneously, while 0 represents the start of an independent
    /// authorization policy. From a logical standpoint, consequent authorizers
    /// get ANDed while 0 acts as an OR gate, providing great flexibility in
    /// forming an authorization policy out of simple building blocks. We could
    /// also define a NOT gate here to achieve a full set of universal logic
    /// gates, but that does not make much sense in this context because
    /// authorizers tend to check for positive conditions (have paid, is
    /// whitelisted, etc.) and we would not need policies that require these to
    /// be false.
    /// Note that authorizers should not start or end with 0s, and 0s should
    /// not be used consecutively (e.g., [X, Y, 0, 0, Z, T]).
    /// @param endpointId Endpoint ID
    /// @param requester Address of the requester contract
    /// @return authorized If the requester contract is authorized to call the
    /// endpoint
    function checkIfAuthorized(
        bytes32 endpointId,
        address requester
        )
        external
        view
        returns(bool authorized)
    {
        uint256 noAuthorizers = endpoints[endpointId].authorizers.length;
        // authorizedByAll will remain true as long as none of the authorizers
        // in a group reports the requester to be unauthorized.
        bool authorizedByAll = true;
        for (uint256 authorizerInd = 0; authorizerInd < noAuthorizers; authorizerInd++)
        {
            address authorizerAddress = endpoints[endpointId].authorizers[authorizerInd];
            if (authorizerAddress == address(0)) {
                // If we have reached a 0 without getting any unauthorized
                // reports, we can return true
                if  (authorizedByAll) {
                    return true;
                }
                // Otherwise, reset authorizedByAll and start checking the next
                // group
                authorizedByAll = true;
            }
            // We only need to check the next authorizer if we have a good track
            // record for this group
            else if (authorizedByAll) {
                AuthorizerInterface authorizer = AuthorizerInterface(authorizerAddress);
                // Set authorizedByAll to false if we got an unauthorized report.
                // This means that we will not be able to return a true from
                // this group of authorizers.
                if (!authorizer.checkIfAuthorized(endpointId, requester)) {
                    authorizedByAll = false;
                }
            }
        }
        // Finally, if we have reached the end of the authorizers (i.e., we
        // are checking the last group), just return the current authorizedByAll,
        // which will only be true if all authorizers from the last group have
        // returned true.
        return authorizedByAll;
    }
}
