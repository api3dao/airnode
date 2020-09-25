// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IConvenience.sol";
import "./interfaces/IAuthorizer.sol";
import "./interfaces/IAirnode.sol";


contract Convenience is IConvenience {
    IAirnode public airnode;


    constructor (address _airnode)
        public
    {
        airnode = IAirnode(_airnode);
    }

    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        override
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            uint256[] memory requesterInd,
            address[] memory designatedWallets,
            address[] memory fulfillAddresses,
            bytes4[] memory fulfillFunctionIds,
            bytes[] memory parameters
        )
    {
        providerIds = new bytes32[](templateIds.length);
        endpointIds = new bytes32[](templateIds.length);
        requesterInd = new uint256[](templateIds.length);
        designatedWallets = new address[](templateIds.length);
        fulfillAddresses = new address[](templateIds.length);
        fulfillFunctionIds = new bytes4[](templateIds.length);
        parameters = new bytes[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++)
        {
            (
                providerIds[ind],
                endpointIds[ind],
                requesterInd[ind],
                designatedWallets[ind],
                fulfillAddresses[ind],
                fulfillFunctionIds[ind],
                parameters[ind]
            ) = airnode.getTemplate(templateIds[ind]);
        }
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
        public
        view
        override
        returns(bool status)
    {
        address[] memory authorizers = airnode.getEndpointAuthorizers(providerId, endpointId);  
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

    function checkAuthorizationStatuses(
        bytes32[] calldata providerIds,
        bytes32[] calldata endpointIds,
        uint256[] calldata requesterInds,
        address[] calldata clientAddresses
        )
        external
        view
        override
        returns (bool[] memory statuses)
    {
        require(
            providerIds.length == endpointIds.length
                && providerIds.length == requesterInds.length
                && providerIds.length == clientAddresses.length,
            "Parameter lengths must be equal"
        );
        statuses = new bool[](providerIds.length);
        for (uint256 ind = 0; ind < providerIds.length; ind++)
        {
            statuses[ind] = checkAuthorizationStatus(
                providerIds[ind],
                endpointIds[ind],
                requesterInds[ind],
                clientAddresses[ind]
                );
        }
    }
}