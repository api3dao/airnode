// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

contract AirnodePsp {
    mapping(address => address) public airnodeToAuthorizer;
    mapping(address => mapping(address => bool))
        public sponsorToSubscriberToSponsorshipStatus;
    mapping(address => uint256) public subscriberToSubscriptionCountPlusOne;

    function setAuthorizer(address authorizer) external {
        airnodeToAuthorizer[msg.sender] = authorizer;
    }

    function setSponsorshipStatus(address subscriber, bool sponsorshipStatus)
        external
    {
        // Initialize the subscriber subscription count for consistent request gas cost
        if (subscriberToSubscriptionCountPlusOne[subscriber] == 0) {
            subscriberToSubscriptionCountPlusOne[subscriber] = 1;
        }
        sponsorToSubscriberToSponsorshipStatus[msg.sender][
            subscriber
        ] = sponsorshipStatus;
    }
}
