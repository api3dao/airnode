// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodePsp {
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
