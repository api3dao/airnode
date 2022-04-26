// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOwnableCallForwarder {
    function forwardCall(
        address forwardTarget,
        bytes calldata forwardedCalldata
    ) external payable returns (bytes memory returnedData);
}
