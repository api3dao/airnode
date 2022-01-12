// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodePspV1.sol";

interface IAirnodePspRelayedV1 is IAirnodePspV1 {
    event FulfilledSubscriptionRelayed(
        address indexed relayer,
        bytes32 indexed subscriptionId,
        address indexed airnode,
        uint256 timestamp,
        bytes data
    );

    function fulfillSubscriptionRelayed(
        bytes32 subscriptionId,
        address relayer,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);
}
