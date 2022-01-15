// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./AirnodeRrpRelayedV1.sol";
import "./interfaces/IAirnodePspV1.sol";

/// @title Airnode publish–subscribe protocol (PSP)
contract AirnodePspV1 is AirnodeRrpRelayedV1, IAirnodePspV1 {
    using ECDSA for bytes32;

    struct Subscription {
        bytes32 templateId;
        bytes parameters;
        bytes conditions;
        address sponsor;
        address requester;
        bytes4 fulfillFunctionId;
    }

    /// @notice Subscription with the ID
    mapping(bytes32 => Subscription) public subscriptions;

    /// @notice Creates a subscription record
    /// @param templateId Template ID
    /// @param parameters Parameters provided by the subscription in addition
    /// to the parameters in the request template
    /// @param conditions Conditions under which the subscription is requested
    /// to be fulfilled
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @param fulfillFunctionId Selector of the function to be called for
    /// fulfillment
    /// @return subscriptionId Subscription ID
    function createSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external override returns (bytes32 subscriptionId) {
        require(
            templates[templateId].airnode != address(0),
            "Template does not exist"
        );
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        require(
            conditions.length <= MAXIMUM_PARAMETER_LENGTH,
            "Conditions too long"
        );
        require(sponsor != address(0), "Sponsor address zero");
        require(requester != address(0), "Requester address zero");
        require(fulfillFunctionId != bytes4(0), "Function selector zero");
        subscriptionId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                templateId,
                parameters,
                conditions,
                sponsor,
                requester,
                fulfillFunctionId
            )
        );
        if (subscriptions[subscriptionId].templateId == bytes32(0)) {
            subscriptions[subscriptionId] = Subscription({
                templateId: templateId,
                parameters: parameters,
                conditions: conditions,
                sponsor: sponsor,
                requester: requester,
                fulfillFunctionId: fulfillFunctionId
            });
            emit CreatedSubscription(
                subscriptionId,
                templateId,
                parameters,
                conditions,
                sponsor,
                requester,
                fulfillFunctionId
            );
        }
    }

    /// @notice Called by the Airnode to fulfill the subscription
    /// @dev An Airnode gets the active subscriptions that it needs to serve
    /// from Allocator contracts. These subscriptions will be fulfilled
    /// continually, as long as the conditions specified under their parameters
    /// are met. In other words, unlike RRP requests, a subscription being
    /// fulfilled does not result in its expiration.
    /// The Airnode will only fulfill a subscription if the subsequent static
    /// call returns `true` for `callSuccess`. If it does not in this static
    /// call or the transaction following that, this will not be handled by the
    /// Airnode in any way (i.e., there is no error message as in RRP).
    /// @param subscriptionId Subscription ID
    /// @param timestamp Timestamp used in the signature
    /// @param data Fulfillment data
    /// @param signature Subscription ID, a timestamp and the sponsor wallet
    /// address signed by the Airnode address
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillSubscription(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external override returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        address airnode = templates[subscription.templateId].airnode;
        require(airnode != address(0), "Subscription does not exist");
        require(
            (
                keccak256(
                    abi.encodePacked(subscriptionId, timestamp, msg.sender)
                ).toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Signature mismatch"
        );
        address requester = subscription.requester;
        address sponsor = subscription.sponsor;
        require(
            requester == sponsor ||
                sponsorToRequesterToSponsorshipStatus[sponsor][requester],
            "Requester not sponsored"
        );
        (callSuccess, callData) = requester.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(
                subscription.fulfillFunctionId,
                subscriptionId,
                airnode,
                timestamp,
                data
            )
        );
        if (callSuccess) {
            emit FulfilledSubscription(
                airnode,
                subscriptionId,
                timestamp,
                data
            );
        }
    }
}
