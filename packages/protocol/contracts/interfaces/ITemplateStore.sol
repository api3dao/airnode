// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface ITemplateStore {
    event TemplateCreated(
        bytes32 indexed templateId,
        bytes32 airnodeId,
        bytes32 endpointId,
        bytes parameters
    );

    function createTemplate(
        bytes32 airnodeId,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

    function getTemplate(bytes32 templateId)
        external
        view
        returns (
            bytes32 airnodeId,
            bytes32 endpointId,
            bytes memory parameters
        );
}
