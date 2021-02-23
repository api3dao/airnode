// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IConvenience.sol";
import "./authorizers/interfaces/IAuthorizer.sol";
import "./interfaces/IAirnode.sol";


contract Convenience is IConvenience {
    IAirnode public airnode;


    constructor (address _airnode)
        public
    {
        airnode = IAirnode(_airnode);
    }

    /// @notice A convenience function to retrieve provider parameters and the
    /// block number with a single call
    /// @param providerId Provider ID
    /// @return admin Provider admin
    /// @return xpub Master public key of the provider node
    /// @return authorizers Authorizer contract addresses
    /// @return blockNumber Block number
    function getProviderAndBlockNumber(bytes32 providerId)
        external
        view
        override
        returns (
            address admin,
            string memory xpub,
            address[] memory authorizers,
            uint256 blockNumber
        )
    {
        (admin, xpub, authorizers) = airnode.getProvider(providerId);
        blockNumber = block.number;
    }

    /// @notice A convenience function to retrieve multiple templates with a
    /// single call
    /// @param templateIds Request template IDs
    /// @return providerIds Provider IDs from ProviderStore
    /// @return endpointIds Endpoint IDs from EndpointStore
    /// @return requesterIndices Requester indices from RequesterStore
    /// @return designatedWallets Designated wallets that are requested to
    /// fulfill the request
    /// @return fulfillAddresses Addresses that will be called to fulfill
    /// @return fulfillFunctionIds Signatures of the functions that will be
    /// called to fulfill
    /// @return parameters Array of static request parameters (i.e., parameters
    /// that will not change between requests, unlike the dynamic parameters
    /// determined at runtime)
    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        override
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            uint256[] memory requesterIndices,
            address[] memory designatedWallets,
            address[] memory fulfillAddresses,
            bytes4[] memory fulfillFunctionIds,
            bytes[] memory parameters
        )
    {
        providerIds = new bytes32[](templateIds.length);
        endpointIds = new bytes32[](templateIds.length);
        requesterIndices = new uint256[](templateIds.length);
        designatedWallets = new address[](templateIds.length);
        fulfillAddresses = new address[](templateIds.length);
        fulfillFunctionIds = new bytes4[](templateIds.length);
        parameters = new bytes[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++)
        {
            (
                providerIds[ind],
                endpointIds[ind],
                requesterIndices[ind],
                designatedWallets[ind],
                fulfillAddresses[ind],
                fulfillFunctionIds[ind],
                parameters[ind]
                ) = airnode.getTemplate(templateIds[ind]);
        }
    }

    /// @notice Uses the authorizer contracts of of a provider to decide if a
    /// request is authorized. Once an oracle node receives a request, it calls
    /// this method to determine if it should respond. Similarly, third parties
    /// can use this method to determine if a particular request would be
    /// authorized.
    /// @dev This method is meant to be called off-chain.
    /// The elements of the authorizer array are either addresses of Authorizer
    /// contracts with the interface defined in IAuthorizer or 0.
    /// [] returns false (deny everything), [0] returns true (accept
    /// everything).
    /// @param providerId Provider ID from ProviderStore
    /// @param requestId Request ID
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterIndex Requester index from RequesterStore
    /// @param designatedWallet Designated wallet
    /// @param clientAddress Client address
    /// @return status Authorization status of the request
    function checkAuthorizationStatus(
        bytes32 providerId,
        bytes32 requestId,
        bytes32 endpointId,
        uint256 requesterIndex,
        address designatedWallet,
        address clientAddress
        )
        public
        view
        override
        returns(bool status)
    {
        (, , address[] memory authorizerAddresses) = airnode.getProvider(providerId);
        uint256 noAuthorizers = authorizerAddresses.length;
        for (uint256 ind = 0; ind < noAuthorizers; ind++)
        {
            address authorizerAddress = authorizerAddresses[ind];
            if (authorizerAddress == address(0))
            {
                return true;
            }
            IAuthorizer authorizer = IAuthorizer(authorizerAddresses[ind]);
            if (authorizer.checkIfAuthorized(
                requestId,
                providerId,
                endpointId,
                requesterIndex,
                designatedWallet,
                clientAddress
                ))
            {
                return true;
            }
        }
        return false;
    }

    /// @notice A convenience function to make multiple authorization status
    /// checks with a single call
    /// @dev If this reverts, the user should use checkAuthorizationStatus() to
    /// do the checks individually
    /// @param providerId Provider ID from ProviderStore
    /// @param requestIds Request IDs
    /// @param endpointIds Endpoint IDs from EndpointStore
    /// @param requesterIndices Requester indices from RequesterStore
    /// @param designatedWallets Designated wallets
    /// @param clientAddresses Client addresses
    /// @return statuses Authorization statuses of the request
    function checkAuthorizationStatuses(
        bytes32 providerId,
        bytes32[] calldata requestIds,
        bytes32[] calldata endpointIds,
        uint256[] calldata requesterIndices,
        address[] calldata designatedWallets,
        address[] calldata clientAddresses
        )
        external
        view
        override
        returns (bool[] memory statuses)
    {
        require(
            requestIds.length == endpointIds.length
                && requestIds.length == requesterIndices.length
                && requestIds.length == designatedWallets.length
                && requestIds.length == clientAddresses.length,
            "Parameter lengths must be equal"
        );
        statuses = new bool[](requestIds.length);
        for (uint256 ind = 0; ind < requestIds.length; ind++)
        {
            statuses[ind] = checkAuthorizationStatus(
                providerId,
                requestIds[ind],
                endpointIds[ind],
                requesterIndices[ind],
                designatedWallets[ind],
                clientAddresses[ind]
                );
        }
    }
}
