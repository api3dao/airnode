// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ITemplateStore.sol";

interface ISubscriptionStore is ITemplateStore {
    event StoredSubscription(
        bytes32 indexed subscriptionId,
        bytes32 templateId,
        bytes parameters,
        bytes conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    );

    function storeSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external returns (bytes32 subscriptionId);

    function subscriptions(bytes32 subscriptionId)
        external
        view
        returns (
            bytes32 templateId,
            bytes memory parameters,
            bytes memory conditions,
            address relayer,
            address sponsor,
            address requester,
            bytes4 fulfillFunctionId
        );
}
