// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../rrp/interfaces/IAirnodeRrp.sol";

contract AirnodePsp {
    using ECDSA for bytes32;

    struct Subscription {
        bytes32 templateId;
        address sponsor;
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

    function createSubscription(
        bytes32 templateId,
        address sponsor,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId) {
        subscriptionId = keccak256(
            abi.encode(
                templateId,
                sponsor,
                conditionAddress,
                conditionFunctionId,
                fulfillAddress,
                fulfillFunctionId,
                parameters
            )
        );
        subscriptions[subscriptionId] = Subscription({
            templateId: templateId,
            sponsor: sponsor,
            conditionAddress: conditionAddress,
            conditionFunctionId: conditionFunctionId,
            fulfillAddress: fulfillAddress,
            fulfillFunctionId: fulfillFunctionId,
            parameters: parameters
        });
    }

    function fulfill(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData) {
        Subscription storage subscription = subscriptions[subscriptionId];
        (address airnode, , ) = airnodeRrp.templates(subscription.templateId);
        require(
            (
                keccak256(abi.encodePacked(subscriptionId, data))
                    .toEthSignedMessageHash()
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
