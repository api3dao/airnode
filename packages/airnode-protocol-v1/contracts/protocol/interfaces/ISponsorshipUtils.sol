// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ISponsorshipUtils {
    event SetRrpSponsorshipStatus(
        address indexed sponsor,
        address indexed requester,
        bool sponsorshipStatus
    );

    event SetPspSponsorshipStatus(
        address indexed sponsor,
        bytes32 indexed subscriptionId,
        bool sponsorshipStatus
    );

    function setRrpSponsorshipStatus(address requester, bool sponsorshipStatus)
        external;

    function setPspSponsorshipStatus(
        bytes32 subscriptionId,
        bool sponsorshipStatus
    ) external;

    function sponsorToRequesterToRrpSponsorshipStatus(
        address sponsor,
        address requester
    ) external view returns (bool sponsorshipStatus);

    function sponsorToSubscriptionIdToPspSponsorshipStatus(
        address sponsor,
        bytes32 subscriptionId
    ) external view returns (bool sponsorshipStatus);
}
