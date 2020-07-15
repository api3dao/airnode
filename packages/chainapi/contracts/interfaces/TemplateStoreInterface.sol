// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface TemplateStoreInterface {
    event TemplateCreated(
        bytes32 indexed id,
        bytes32 providerId,
        bytes32 endpointId,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes parameters
        );

    function createTemplate(
        bytes32 providerId,
        bytes32 endpointId,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 templateId);

    function getTemplate(bytes32 templateId)
        external
        view
        returns (
            bytes32 providerId,
            bytes32 endpointId,
            address fulfillAddress,
            address errorAddress,
            bytes4 fulfillFunctionId,
            bytes4 errorFunctionId,
            bytes memory parameters
        );
}