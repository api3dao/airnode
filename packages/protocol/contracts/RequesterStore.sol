// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/IRequesterStore.sol";

/// @title The contract where the requesters are stored
/// @notice This contract is used by requesters to manage their endorsemenets.
/// A requester endorsing a client means that the client can request their
/// requests to be fulfilled by the respective requester's designated wallets.
contract RequesterStore is IRequesterStore {
    mapping(address => mapping(address => bool))
        public requesterToClientAddressToEndorsementStatus;
    mapping(address => uint256) public clientAddressToNoRequests;
    mapping(address => uint256) public requesterToNextWithdrawalRequestIndex;

    /// @notice Called by the requester admin to endorse a client, i.e., allow
    /// a client to use its designated wallets, or disendorse them
    /// @dev This is not Airnode-specific, i.e., the requester allows the
    /// client's requests to be fulfilled through its designated wallets across
    /// all Airnodes
    /// @param clientAddress Client address
    /// @param endorsementStatus Endorsement status
    function setClientEndorsementStatus(
        address clientAddress,
        bool endorsementStatus
    ) external override {
        // Initialize the client nonce for consistent request gas cost
        if (clientAddressToNoRequests[clientAddress] == 0) {
            clientAddressToNoRequests[clientAddress] = 1;
        }
        requesterToClientAddressToEndorsementStatus[msg.sender][
            clientAddress
        ] = endorsementStatus;
        emit ClientEndorsementStatusSet(
            msg.sender,
            clientAddress,
            endorsementStatus
        );
    }
}
