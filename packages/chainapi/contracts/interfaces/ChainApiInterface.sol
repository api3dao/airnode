// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface ChainApiInterface {
    function makeRequest(
        bytes32 providerId,
        bytes32 templateId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);
}
