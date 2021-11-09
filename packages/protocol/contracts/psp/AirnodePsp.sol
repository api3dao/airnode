// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../rrp/interfaces/IAirnodeRrp.sol";

// PSP only supports templates, and not "full subscriptions". Full requests are only more
// economical for RRP because request-time parameters are not written to storage and
// emitted as logs. Here, both the template parameters and the request-time parameters
// are stored in storage, so creating a template and making a "template subscription" would
// have been equivalent to making a "full subscription". 
contract AirnodePsp {
    using ECDSA for bytes32;

    // Note that we do not specify `sponsorWallet`, as it won't be checked in `fulfill()`.
    // This is because botched fulfillments are not a threat (read more at `fulfill()` comments).
    // We do not specify `sponsor` because it is returned by the allocator along with the respective
    // `subscriptionId`. This implies that subscriptions can be served by anyone with
    // signed data.
    // The struct below could do without the `parameters` parameter (and we would force the
    // user to put everything in the template `parameters`). However, RRP is designed around the
    // reuse of templates and Airnode ABI is not very efficient in encoding parameters, which
    // is good enough reason to allow PSP to reuse more generic templates with additional
    // subscription-specific parameters.
    struct Subscription {
        bytes32 templateId;
        address conditionAddress;
        bytes4 conditionFunctionId;
        address fulfillAddress;
        bytes4 fulfillFunctionId;
        bytes parameters;
    }

    IAirnodeRrp public airnodeRrp;

    mapping(bytes32 => Subscription) public subscriptions;

    constructor(address airnodeRrp_) {
        airnodeRrp = IAirnodeRrp(airnodeRrp_);
    }

    // We store subscriptions in storage because we don't trust event logs to persist.
    // A subscription should be able to live for years when left untouched.
    function createSubscription(
        bytes32 templateId,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId) {
        // Subscription IDs do not need to be unique. Airnode will not serve the same
        // subscription ID multiple times
        subscriptionId = keccak256(
            abi.encode(
                templateId,
                conditionAddress,
                conditionFunctionId,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        subscriptions[subscriptionId] = Subscription({
            templateId: templateId,
            conditionAddress: conditionAddress,
            conditionFunctionId: conditionFunctionId,
            fulfillAddress: fulfillAddress,
            fulfillFunctionId: fulfillFunctionId,
            parameters: parameters
        });
    }

    // We are having the node fulfill through this function because we don't want the requester
    // contract to have to import ECDSA.sol
    // The node doesn't attempt to fulfill if `callSuccess` is false, logs the revert string internally.
    function fulfill(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        // Note that we are not verifying that msg.sender is a pre-determined `sponsorWallet`.
        // This because one cannot "botch" (e.g., by specifying a low gas limit) a PSP fulfillment
        // like an RRP fulfillment (because previous failed fulfillments don't prevent future
        // successful ones).
        (address airnode, , ) = airnodeRrp.templates(subscription.templateId);
        // It is a concern for someone to have the API provider sign a response, to be used much
        // later (for example, would be very problematic for asset price data feeds). Therefore,
        // the timestamp is expect to be appended to `data`
        require(
            (
                keccak256(
                    abi.encodePacked(subscriptionId, data)
                ).toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Invalid signature"
        );
        (callSuccess, callData) = subscription.fulfillAddress.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(
                subscription.fulfillFunctionId,
                subscriptionId,
                data
            )
        );
    }
}
