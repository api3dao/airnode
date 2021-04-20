// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./interfaces/IRequesterStore.sol";

/// @title The contract where the requesters are stored
/// @notice This contract is used by requesters to manage their endorsemenets.
/// A requester endorsing a client means that the client can request their
/// requests to be fulfilled by the respective requester's designated wallets.
contract RequesterStore is IRequesterStore {
    mapping(uint256 => address) public requesterIndexToAdmin;
    mapping(uint256 => mapping(address => bool)) public requesterIndexToClientAddressToEndorsementStatus;
    mapping(address => uint256) public clientAddressToNoRequests;
    mapping(uint256 => uint256) public requesterIndexToNextWithdrawalRequestIndex;
    uint256 private noRequesters = 1;

    /// @dev Reverts if the caller is not the requester admin
    /// @param requesterIndex Requester index
    modifier onlyRequesterAdmin(uint256 requesterIndex)
    {
        require(
            msg.sender == requesterIndexToAdmin[requesterIndex],
            "Caller not requester admin"
            );
        _;
    }

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
        requesterIndexToNextWithdrawalRequestIndex[requesterIndex] = 1;
        emit RequesterCreated(
            requesterIndex,
            admin
            );
    }

    /// @notice Sets the requester admin
    /// @param requesterIndex Requester index
    /// @param admin Requester admin
    function setRequesterAdmin(
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
    /// a client to use its designated wallets, or disendorse them
    /// @dev This is not Airnode-specific, i.e., the requester allows the
    /// client's requests to be fulfilled through its designated wallets across
    /// all Airnodes
    /// @param requesterIndex Requester index
    /// @param clientAddress Client address
    function setClientEndorsementStatus(
        uint256 requesterIndex,
        address clientAddress,
        bool endorsementStatus
        )
        external
        override
        onlyRequesterAdmin(requesterIndex)
    {
        // Initialize the client nonce for consistent request gas cost
        if (clientAddressToNoRequests[clientAddress] == 0)
        {
            clientAddressToNoRequests[clientAddress] = 1;
        }
        requesterIndexToClientAddressToEndorsementStatus[requesterIndex][clientAddress] = endorsementStatus;
        emit ClientEndorsementStatusSet(
            requesterIndex,
            clientAddress,
            endorsementStatus
            );
    }
}
