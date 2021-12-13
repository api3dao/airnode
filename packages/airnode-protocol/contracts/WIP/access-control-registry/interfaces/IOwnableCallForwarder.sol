// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IOwnableCallForwarder {
    event ForwardedCall(
        address indexed targetAddress,
        uint256 forwardedValue,
        bytes forwardedCalldata,
        bytes returnedData
    );

    function forwardCall(
        address targetAddress,
        bytes calldata forwardedCalldata
    ) external payable returns (bytes memory returnedData);
}
