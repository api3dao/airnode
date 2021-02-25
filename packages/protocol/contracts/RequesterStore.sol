// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IRequesterStore.sol";

/// @title The contract where the requesters are stored
/// @notice This contract is used by requesters to manage their endorsemenets.
/// A requester endorsing a client means that the client can request their
/// requests to be fulfilled by the respective requester's designated wallets.
contract RequesterStore is IRequesterStore {
    mapping(uint256 => address) public requesterIndexToAdmin;
    mapping(uint256 => mapping(address => bool)) public requesterIndexToClientAddressToEndorsementStatus;
    mapping(address => uint256) public clientAddressToNoRequests;
    mapping(uint256 => uint256) public requesterIndexToNoWithdrawalRequests;
    uint256 private noRequesters = 1;


    /// @notice Creates a requester with the given parameters, addressable by
    /// the index it returns
    /// @param admin Requester admin
    /// @return requesterIndex Requester index
    function createRequester(address admin)
        external
        override
        returns (uint256 requesterIndex)
    {
        requesterIndex = noRequesters++;
        requesterIndexToAdmin[requesterIndex] = admin;
        // Initialize the requester nonce during creation for consistent
        // withdrawal request gas cost
        requesterIndexToNoWithdrawalRequests[requesterIndex] = 1;
        emit RequesterCreated(
            requesterIndex,
            admin
            );
    }

    /// @notice Updates the requester admin
    /// @param requesterIndex Requester index
    /// @param admin Requester admin
    function updateRequesterAdmin(
        uint256 requesterIndex,
        address admin
        )
        external
        override
        onlyRequesterAdmin(requesterIndex)
    {
        requesterIndexToAdmin[requesterIndex] = admin;
        emit RequesterUpdated(
            requesterIndex,
            admin
            );
    }

    /// @notice Called by the requester admin to endorse a client, i.e., allow
    /// a client to use its designated wallets
    /// @dev This is not provider specific, i.e., the requester allows the
    /// client's requests to be fulfilled through its designated wallets across
    /// all providers
    /// @param requesterIndex Requester index
    /// @param clientAddress Client address
    function updateClientEndorsementStatus(
        uint256 requesterIndex,
        address clientAddress,
        bool endorsementStatus
        )
        external
        override
        onlyRequesterAdmin(requesterIndex)
    {
        // Initialize the client nonce if it is being endorsed for the first
        // time for consistent request gas cost
        if (endorsementStatus && clientAddressToNoRequests[clientAddress] == 0)
        {
            clientAddressToNoRequests[clientAddress] = 1;
        }
        requesterIndexToClientAddressToEndorsementStatus[requesterIndex][clientAddress] = endorsementStatus;
        emit ClientEndorsementStatusUpdated(
            requesterIndex,
            clientAddress,
            endorsementStatus
            );
    }

    /// @dev Reverts if the caller is not the requester admin
    /// @param requesterIndex Requester index
    modifier onlyRequesterAdmin(uint256 requesterIndex)
    {
        require(
            msg.sender == requesterIndexToAdmin[requesterIndex],
            "Caller is not requester admin"
            );
        _;
    }
}
