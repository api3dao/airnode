// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodeRrpRelayedV1.sol";

interface IAirnodePspV1 is IAirnodeRrpRelayedV1 {
    event CreatedSubscription(
        bytes32 indexed subscriptionId,
        bytes32 requestHash,
        bytes32 templateId,
        bytes parameters,
        address sponsor,
        address requester
    );

    event FulfilledSubscription(
        address indexed airnode,
        bytes32 indexed subscriptionId,
        uint256 timestamp,
        bytes data
    );

    function createSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor,
        address requester
    ) external returns (bytes32 subscriptionId);

    function fulfillSubscription(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function subscriptions(bytes32 subscriptionId)
        external
        view
        returns (
            bytes32 requestHash,
            bytes32 templateId,
            bytes memory parameters,
            address sponsor,
            address requester
        );
}
