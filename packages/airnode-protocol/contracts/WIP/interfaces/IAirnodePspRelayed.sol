// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodePsp.sol";

interface IAirnodePspRelayed is IAirnodePsp {
    event FulfilledSubscriptionRelayed(
        address indexed airnode,
        bytes32 indexed subscriptionId,
        uint256 timestamp,
        bytes data
    );

    function fulfillSubscriptionRelayed(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);
}
