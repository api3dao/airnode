// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ISponsorshipUtils.sol";

contract SponsorshipUtils is ISponsorshipUtils {
    /// @notice Returns the sponsorship status for a sponsor–requester pair
    mapping(address => mapping(address => bool))
        public
        override sponsorToRequesterToRrpSponsorshipStatus;

    mapping(address => mapping(bytes32 => bool))
        public
        override sponsorToSubscriptionIdToPspSponsorshipStatus;

    /// @notice Called by the sponsor to set the sponsorship status of a
    /// requester, i.e., allow or disallow a requester to make requests that
    /// will be fulfilled by the sponsor wallet
    /// @dev This is not Airnode or protocol-specific, i.e., the sponsor allows
    /// the requester's requests to be fulfilled through its sponsor wallets
    /// across all Airnodes and protocols.
    /// In all contracts, we use the "set" verb to refer to setting a value
    /// without considering its previous value, and emitting an event whether
    /// a state change has occurred or not.
    /// @param requester Requester address
    /// @param sponsorshipStatus Sponsorship status
    function setRrpSponsorshipStatus(address requester, bool sponsorshipStatus)
        external
        override
    {
        require(requester != address(0), "Requester address zero");
        sponsorToRequesterToRrpSponsorshipStatus[msg.sender][
            requester
        ] = sponsorshipStatus;
        emit SetRrpSponsorshipStatus(msg.sender, requester, sponsorshipStatus);
    }

    function setPspSponsorshipStatus(
        bytes32 subscriptionId,
        bool sponsorshipStatus
    ) external override {
        require(subscriptionId != bytes32(0), "Subscription ID zero");
        sponsorToSubscriptionIdToPspSponsorshipStatus[msg.sender][
            subscriptionId
        ] = sponsorshipStatus;
        emit SetPspSponsorshipStatus(
            msg.sender,
            subscriptionId,
            sponsorshipStatus
        );
    }
}
