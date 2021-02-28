// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./RequesterStore.sol";
import "./interfaces/IProviderStore.sol";
import "./authorizers/interfaces/IAuthorizer.sol";

/// @title The contract where the providers are stored
contract ProviderStore is RequesterStore, IProviderStore {
    struct Provider {
        address admin;
        string xpub;
        address[] authorizers;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;

    /// @notice Allows the master wallet (m) of the provider to set its
    /// parameters on this chain
    /// @dev This method can also be used to update `admin`, `xpub` and/or
    /// `authorizers`.
    /// `admin` is not used in the protocol contracts. It is intended to
    /// potentially be referred to in authorizer contracts.
    /// Note that the provider can announce an incorrect `xpub`. However, the
    /// mismatch between it and the providerId can be detected off-chain.
    /// This needs to be payable to be callable by
    /// setProviderParametersAndForwardFunds().
    /// @param admin Provider admin
    /// @param xpub Master public key of the provider
    /// @param authorizers Authorizer contract addresses of the provider
    /// @return providerId Provider ID
    function setProviderParameters(
        address admin,
        string calldata xpub,
        address[] calldata authorizers
        )
        public
        payable
        override
        returns (bytes32 providerId)
    {
        providerId = keccak256(abi.encode(msg.sender));
        providers[providerId] = Provider({
            admin: admin,
            xpub: xpub,
            authorizers: authorizers
            });
        emit ProviderParametersSet(
            providerId,
            admin,
            xpub,
            authorizers
            );
    }

    /// @notice Called by the requester admin to create a request for the
    /// provider to send the funds kept in their designated wallet to the
    /// destination
    /// @dev We do not need to use the withdrawal request parameters in the
    /// request ID hash to validate them at the node side because all of the
    /// parameters are used during fulfillment and will get validated on-chain
    /// @param providerId Provider ID
    /// @param requesterIndex Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that the withdrawal is
    /// requested from
    /// @param destination Withdrawal destination
    function requestWithdrawal(
        bytes32 providerId,
        uint256 requesterIndex,
        address designatedWallet,
        address destination
    )
        external
        override
        onlyRequesterAdmin(requesterIndex)
    {
        bytes32 withdrawalRequestId = keccak256(abi.encodePacked(
            requesterIndexToNoWithdrawalRequests[requesterIndex]++,
            requesterIndex,
            address(this)
            ));
        bytes32 withdrawalParameters = keccak256(abi.encodePacked(
            providerId,
            requesterIndex,
            designatedWallet,
            destination
            ));
        withdrawalRequestIdToParameters[withdrawalRequestId] = withdrawalParameters;
        emit WithdrawalRequested(
            providerId,
            requesterIndex,
            withdrawalRequestId,
            designatedWallet,
            destination
            );
    }

    /// @notice Called by the provider's Airnode using the designated wallet to
    /// fulfill the withdrawal request made by the requester
    /// @dev The Airnode sends the funds through this method to emit an
    /// event that indicates that the withdrawal request has been fulfilled
    /// @param providerId Provider ID
    /// @param requesterIndex Requester index from RequesterStore
    /// @param destination Withdrawal destination
    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        bytes32 providerId,
        uint256 requesterIndex,
        address destination
        )
        external
        payable
        override
    {
        bytes32 withdrawalParameters = keccak256(abi.encodePacked(
            providerId,
            requesterIndex,
            msg.sender,
            destination
            ));
        require(
            withdrawalRequestIdToParameters[withdrawalRequestId] == withdrawalParameters,
            "No such withdrawal request"
            );
        delete withdrawalRequestIdToParameters[withdrawalRequestId];
        emit WithdrawalFulfilled(
            providerId,
            requesterIndex,
            withdrawalRequestId,
            msg.sender,
            destination,
            msg.value
            );
        (bool success, ) = destination.call{ value: msg.value }("");  // solhint-disable-line
        require(success, "Transfer failed");
    }

    /// @notice Uses the authorizer contracts of of a provider to decide if a
    /// request is authorized. Once an Airnode receives a request, it calls
    /// this method to determine if it should respond. Similarly, third parties
    /// can use this method to determine if a particular request would be
    /// authorized.
    /// @dev This method is meant to be called off-chain by the Airnode to
    /// decide if it should respond to a request. The requester can also call
    /// it, yet this function returning true should not be taken as a guarantee
    /// of the subsequent call request being fulfilled (as the provider may
    /// update their authorizers in the meantime).
    /// The provider authorizers being empty means all requests will be denied,
    /// while any `address(0)` authorizer means all requests will be accepted.
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
        address[] memory authorizerAddresses = providers[providerId].authorizers;
        uint256 noAuthorizers = authorizerAddresses.length;
        for (uint256 ind = 0; ind < noAuthorizers; ind++)
        {
            address authorizerAddress = authorizerAddresses[ind];
            if (authorizerAddress == address(0))
            {
                return true;
            }
            IAuthorizer authorizer = IAuthorizer(authorizerAddress);
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

    /// @notice Retrieves the parameters of the provider addressed by the ID
    /// @param providerId Provider ID
    /// @return admin Provider admin
    /// @return xpub Master public key of the provider
    /// @return authorizers Authorizer contract addresses of the provider
    function getProvider(bytes32 providerId)
        external
        view
        override
        returns (
            address admin,
            string memory xpub,
            address[] memory authorizers
        )
    {
        Provider storage provider = providers[providerId];
        admin = provider.admin;
        xpub = provider.xpub;
        authorizers = provider.authorizers;
    }
}
