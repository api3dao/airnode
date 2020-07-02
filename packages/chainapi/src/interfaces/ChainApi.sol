// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface ChainApi {
    function makeRequest(
        bytes32 providerId,
        bytes32 templateId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);
}
