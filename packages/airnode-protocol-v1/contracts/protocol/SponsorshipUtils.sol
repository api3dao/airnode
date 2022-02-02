// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ISponsorshipUtils.sol";

/// @title Contract that sponsors can use to announce their willingness to
/// sponsor a particular RRP requester or PSP subscription
/// @notice The sponsorship status is not checked during requests or
/// fulfillments, which means the respective Airnode is trusted to make this
/// check through a static call to this contract. The Airnode may skip this
/// check if it has received an off-chain assurance.
/// @dev An Airnode (or relayer) has a "sponsor wallet" dedicated for each
/// account through an HD wallet. When a requester makes a request specifying a
/// sponsor, the Airnode verifies the sponsorship my making a static call to
/// this contract, and uses the respective sponsor wallet to fulfill the
/// request. This allows the sponsor to cover the gas costs of the
/// fulfillments, as they know that funds they have deposited in the respective
/// sponsor wallet will only be used for use-cases they have sponsored.
contract SponsorshipUtils is ISponsorshipUtils {
    /// @notice Sponsorship status for a sponsor–RRP requester pair
    mapping(address => mapping(address => bool))
        public
        override sponsorToRequesterToRrpSponsorshipStatus;

    /// @notice Sponsorship status for a sponsor–PSP subscription pair
    mapping(address => mapping(bytes32 => bool))
        public
        override sponsorToSubscriptionIdToPspSponsorshipStatus;

    /// @notice Called by the sponsor to set the sponsorship status of an RRP
    /// requester
    /// @dev This applies for both regular and relayed RRP requests.
    /// In all contracts, we use the "set" verb to refer to setting a value
    /// without considering its previous value, and emitting an event whether
    /// a state change has occurred or not.
    /// @param requester RRP requester address
    /// @param status Sponsorship status
    function setRrpSponsorshipStatus(address requester, bool status)
        external
        override
    {
        require(requester != address(0), "Requester address zero");
        sponsorToRequesterToRrpSponsorshipStatus[msg.sender][
            requester
        ] = status;
        emit SetRrpSponsorshipStatus(msg.sender, requester, status);
    }

    /// @notice Called by the sponsor to set the sponsorship status of a PSP
    /// subscription
    /// @param subscriptionId Subscription ID
    /// @param status Sponsorship status
    function setPspSponsorshipStatus(bytes32 subscriptionId, bool status)
        external
        override
    {
        require(subscriptionId != bytes32(0), "Subscription ID zero");
        sponsorToSubscriptionIdToPspSponsorshipStatus[msg.sender][
            subscriptionId
        ] = status;
        emit SetPspSponsorshipStatus(msg.sender, subscriptionId, status);
    }
}
