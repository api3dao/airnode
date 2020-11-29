// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IRequesterStore.sol";


/// @title The contract where the requesters are stored
/// @notice This contract is used by requesters to manage their endorsemenets.
/// A requester endorsing a client means that the client can request their
/// requests to be fulfilled by the respective requester's designated wallets.
contract RequesterStore is IRequesterStore {
    mapping(uint256 => address) public requesterIndToAdmin;
    mapping(uint256 => mapping(address => bool)) public requesterIndToClientAddressToEndorsementStatus;
    uint256 private noRequesters = 1;


    /// @notice Creates a requester with the given parameters, addressable by
    /// the index it returns
    /// @param admin Requester admin
    /// @return requesterInd Requester index
    function createRequester(address admin)
        external
        override
        returns (uint256 requesterInd)
    {
        requesterInd = noRequesters++;
        requesterIndToAdmin[requesterInd] = admin;
        emit RequesterCreated(
            requesterInd,
            admin
            );
    }

    /// @notice Updates the requester admin
    /// @param requesterInd Requester index
    /// @param admin Requester admin
    function updateRequesterAdmin(
        uint256 requesterInd,
        address admin
        )
        external
        override
        onlyRequesterAdmin(requesterInd)
    {
        requesterIndToAdmin[requesterInd] = admin;
        emit RequesterUpdated(
            requesterInd,
            admin
            );
    }

    /// @notice Called by the requester admin to endorse a client, i.e., allow
    /// a client to use its designated wallets
    /// @dev This is not provider specific, i.e., the requester allows the
    /// client's requests to be fulfilled through its designated wallets across
    /// all providers
    /// @param requesterInd Requester index
    /// @param clientAddress Client address
    function updateClientEndorsementStatus(
        uint256 requesterInd,
        address clientAddress,
        bool endorsementStatus
        )
        external
        override
        onlyRequesterAdmin(requesterInd)
    {
        requesterIndToClientAddressToEndorsementStatus[requesterInd][clientAddress] = endorsementStatus;
        emit ClientEndorsementStatusUpdated(
            requesterInd,
            clientAddress,
            endorsementStatus
            );
    }

    /// @dev Reverts if the caller is not the requester admin
    /// @param requesterInd Requester index
    modifier onlyRequesterAdmin(uint256 requesterInd)
    {
        require(
            msg.sender == requesterIndToAdmin[requesterInd],
            "Caller is not requester admin"
            );
        _;
    }
}
