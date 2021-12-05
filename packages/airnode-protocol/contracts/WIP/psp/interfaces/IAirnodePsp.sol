// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodePsp {
    event CreatedSubscription(
        bytes32 indexed subscriptionId,
        bytes32 templateId,
        address sponsor,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
    );

    event FulfilledSubscription(
        address indexed airnode,
        bytes32 indexed subscriptionId,
        bytes data
    );

    function createSubscription(
        bytes32 templateId,
        address sponsor,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId);

    function fulfill(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function airnodeRrp() external view returns (address);

    function subscriptions(bytes32 subscriptionId)
        external
        view
        returns (
            bytes32 templateId,
            address sponsor,
            address conditionAddress,
            bytes4 conditionFunctionId,
            address fulfillAddress,
            bytes4 fulfillFunctionId,
            bytes memory parameters
        );
}
