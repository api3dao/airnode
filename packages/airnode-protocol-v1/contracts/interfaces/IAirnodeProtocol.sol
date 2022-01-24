// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodeRrp.sol";

interface IAirnodeProtocol is IAirnodeRrp {
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

    event RegisteredSubscription(
        bytes32 indexed subscriptionId,
        bytes32 templateId,
        bytes parameters,
        bytes conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    );

    event FulfilledSubscription(
        bytes32 indexed subscriptionId,
        uint256 timestamp,
        bytes data
    );

    event FulfilledSubscriptionRelayed(
        bytes32 indexed subscriptionId,
        uint256 timestamp,
        bytes data
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

    function registerSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external returns (bytes32 subscriptionId);

    function fulfillSubscription(
        bytes32 subscriptionId,
        address airnode,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function fulfillSubscriptionRelayed(
        bytes32 subscriptionId,
        address airnode,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

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

    function subscriptionIdToHash(bytes32 subscriptionId)
        external
        view
        returns (bytes32);
}
