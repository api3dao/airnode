// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IPspAuthorizer {
    function isAuthorized(
        bytes32 subscriptionId,
        address airnode,
        bytes32 templateId,
        address sponsor,
        address subscriber
    ) external returns (bool);
}
