// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./AirnodePsp.sol";
import "./interfaces/IPspAuthorizer.sol";

// ~~~ Storage-based PSP ~~~
// + Supports indefinite subscriptions, good for data feeds
// + More robust, assuming reading from the storage will be supported better compared
// to reading logs
// - Expensive to use, subscriptions write to storage
contract AirnodePspStorageBased is AirnodePsp {
    struct Subscription {
        bytes32 templateId;
        uint256 timestamp;
        address sponsor;
        address conditionAddress;
        bytes4 conditionFunctionId;
        address fulfillAddress;
        bytes4 fulfillFunctionId;
        bytes parameters;
    }

    mapping(address => Subscription[]) public airnodeToSubscriptions;

    function subscribe(
        address airnode,
        bytes32 templateId,
        address sponsor,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId) {
        require(
            sponsorToSubscriberToSponsorshipStatus[sponsor][msg.sender],
            "Subscriber not sponsored"
        );
        uint256 subscriberSubscriptionCount = subscriberToSubscriptionCountPlusOne[
                msg.sender
            ];
        airnodeToSubscriptions[airnode].push(
            Subscription({
                templateId: templateId,
                timestamp: block.timestamp,
                sponsor: sponsor,
                conditionAddress: conditionAddress,
                conditionFunctionId: conditionFunctionId,
                fulfillAddress: fulfillAddress,
                fulfillFunctionId: fulfillFunctionId,
                parameters: parameters
            })
        );
        subscriptionId = keccak256(
            abi.encodePacked(
                airnode,
                subscriberSubscriptionCount,
                block.chainid,
                templateId,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        subscriberToSubscriptionCountPlusOne[msg.sender]++;
        // This is a call to a non-trusted authorizer contract.
        // Would it be extra undesirable to loop through an array of non-trusted
        // authorizer contracts like RRP here?
        IPspAuthorizer(airnodeToAuthorizer[airnode]).isAuthorized(
            subscriptionId,
            airnode,
            templateId,
            sponsor,
            msg.sender
        );
    }

    // Does `fromTimestamp` really help here, or would an Airnode would always
    // want to get all of their active subscriptions? For example, subscriptions
    // by data feeds would need to be indefinite.
    function getSubscriptions(
        address airnode,
        uint256 limit,
        uint256 fromTimestamp
    )
        external
        view
        returns (
            bytes32[] memory templateIds,
            uint256[] memory timestamps,
            address[] memory sponsors,
            address[] memory conditionAddresses,
            bytes4[] memory conditionFunctionIds,
            address[] memory fulfillAddresses,
            bytes4[] memory fulfillFunctionIds
        )
    {
        Subscription[] storage airnodeSubscriptions = airnodeToSubscriptions[
            airnode
        ];
        templateIds = new bytes32[](limit);
        timestamps = new uint256[](limit);
        sponsors = new address[](limit);
        conditionAddresses = new address[](limit);
        conditionFunctionIds = new bytes4[](limit);
        fulfillAddresses = new address[](limit);
        fulfillFunctionIds = new bytes4[](limit);
        for (uint256 i = 0; i < limit; i++) {
            if (i == airnodeSubscriptions.length) {
                // There are less than `limit` subscriptions
                break;
            }
            Subscription storage airnodeSubscription = airnodeSubscriptions[
                airnodeSubscriptions.length - i - 1
            ];
            if (airnodeSubscription.timestamp < fromTimestamp) {
                // There are less than `limit` subscriptions that are newer than `fromTimestamp`
                break;
            }
            templateIds[i] = airnodeSubscription.templateId;
            timestamps[i] = airnodeSubscription.timestamp;
            sponsors[i] = airnodeSubscription.sponsor;
            conditionAddresses[i] = airnodeSubscription.conditionAddress;
            conditionFunctionIds[i] = airnodeSubscription.conditionFunctionId;
            fulfillAddresses[i] = airnodeSubscription.fulfillAddress;
            fulfillFunctionIds[i] = airnodeSubscription.fulfillFunctionId;
        }
    }
}
