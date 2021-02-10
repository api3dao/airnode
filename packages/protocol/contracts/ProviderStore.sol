// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IProviderStore.sol";
import "./RequesterStore.sol";


/// @title The contract where the providers are stored
contract ProviderStore is RequesterStore, IProviderStore {
    struct Provider {
        address admin;
        string xpub;
        }

    mapping(bytes32 => Provider) internal providers;
    mapping(bytes32 => bytes32) private withdrawalRequestIdToParameters;


    /// @notice Allows the master wallet (m) of the provider to create a
    /// provider record on this chain
    /// @dev The oracle node should calculate their providerId off-chain and
    /// retrieve its details with a getProvider() call. If the xpub is does not
    /// match, it should call this method to update the provider record.
    /// Note that the provider private key can be used to update admin through
    /// this method. This is allowed on purpose, as the provider private key is
    /// more privileged than the provider admin account.
    /// @param admin Provider admin
    /// @param xpub Master public key of the provider node
    /// @return providerId Provider ID
    function createProvider(
        address admin,
        string calldata xpub
        )
        external
        payable
        override
        returns (bytes32 providerId)
    {
        providerId = keccak256(abi.encode(msg.sender));
        providers[providerId] = Provider({
            admin: admin,
            xpub: xpub
            });
        emit ProviderCreated(
            providerId,
            admin,
            xpub
            );
        if (msg.value > 0)
        {
            (bool success, ) = admin.call{ value: msg.value }("");  // solhint-disable-line
            require(success, "Transfer failed");
        }
    }

    /// @notice Updates the provider
    /// @param providerId Provider ID
    /// @param admin Provider admin
    function updateProvider(
        bytes32 providerId,
        address admin
        )
        external
        override
        onlyProviderAdmin(providerId)
    {
        providers[providerId].admin = admin;
        emit ProviderUpdated(
            providerId,
            admin
            );
    }

    /// @notice Called by the requester admin to create a request for the
    /// provider to send the funds kept in their designated wallet to
    /// destination
    /// @dev We do not need to use the withdrawal request parameters in the
    /// request ID hash to validate them at the node side because all of the
    /// parameters are used during fulfillment and will get validated on-chain.
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
            this
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

    /// @notice Called by the designated wallet to fulfill the withdrawal
    /// request made by the requester
    /// @dev The oracle node sends the funds through this method to emit an
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

    /// @notice Retrieves provider parameters addressed by the ID
    /// @param providerId Provider ID
    /// @return admin Provider admin
    /// @return xpub Master public key of the provider node
    function getProvider(bytes32 providerId)
        external
        view
        override
        returns (
            address admin,
            string memory xpub
        )
    {
        admin = providers[providerId].admin;
        xpub = providers[providerId].xpub;
    }

    /// @dev Reverts if the caller is not the provider admin
    /// @param providerId Provider ID
    modifier onlyProviderAdmin(bytes32 providerId)
    {
        require(
            msg.sender == providers[providerId].admin,
            "Caller is not provider admin"
            );
        _;
    }
}
