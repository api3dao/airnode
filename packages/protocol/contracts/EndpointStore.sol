// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IEndpointStore.sol";
import "./interfaces/IAuthorizer.sol";
import "./ProviderStore.sol";


/// @title The contract where the endpoints are stored
/// @notice This contract is used by the provider admin to associate their
/// endpoints with authorization policies, which both the oracle node and the
/// requester can check to verify authorization.
contract EndpointStore is ProviderStore, IEndpointStore {
    mapping(bytes32 => mapping(bytes32 => address[])) private providerEndpointAuthorizers;


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
        providerEndpointAuthorizers[providerId][endpointId] = authorizers;
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
        authorizers = providerEndpointAuthorizers[providerId][endpointId];
    }

    /// @notice Uses the authorizer contracts of an endpoint of a provider to
    /// decide if a client contract is authorized to call the endpoint. Once an
    /// oracle node receives a request, it calls this method to determine if it
    /// should respond. Similarly, third parties can use this method to
    /// determine if a client contract is authorized to call an endpoint.
    /// @dev Authorizer contracts are not trusted, so this method should only
    /// be called off-chain.
    /// The elements of the authorizer array are either addresses of Authorizer
    /// contracts with the interface defined in IAuthorizer or 0.
    /// Say we have authorizer contracts X, Y, Z, T, and our authorizer
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
    /// Note that authorizers should not start or end with 0, and 0s should
    /// not be used consecutively (e.g., [X, Y, 0, 0, Z, T]).
    /// [] returns false (deny everyone), [0] returns true (accept everyone).
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterInd Requester index from RequesterStore
    /// @param clientAddress Client address
    /// @return status Authorization status of the request
    function checkAuthorizationStatus(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address clientAddress
        )
        external
        view
        override
        returns(bool status)
    {
        address[] storage authorizers = providerEndpointAuthorizers[providerId][endpointId];
        uint256 noAuthorizers = authorizers.length;
        // If no authorizers have been set, deny access by default
        if (noAuthorizers == 0)
        {
            return false;
        }
        // authorizedByAll will remain true as long as none of the authorizers
        // in a group reports that the client is unauthorized
        bool authorizedByAll = true;
        for (uint256 ind = 0; ind < noAuthorizers; ind++)
        {
            address authorizerAddress = authorizers[ind];
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
                IAuthorizer authorizer = IAuthorizer(authorizerAddress);
                // Set authorizedByAll to false if we got an unauthorized report.
                // This means that we will not be able to return a true from
                // this group of authorizers.
                if (!authorizer.checkIfAuthorized(
                    providerId, endpointId, requesterInd, clientAddress
                    )) {
                    authorizedByAll = false;
                }
            }
        }
        // Finally, if we have reached the end of the authorizers (i.e., we
        // are at the last element of the last group), just return the current
        // authorizedByAll, which will only be true if all authorizers from the
        // last group have returned true.
        return authorizedByAll;
    }
}
