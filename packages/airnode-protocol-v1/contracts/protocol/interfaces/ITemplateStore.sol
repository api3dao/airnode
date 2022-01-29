// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ITemplateStore {
    event StoredTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
    );

    event RegisteredTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
    );

    function storeTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

    function registerTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

    function getStoredTemplate(bytes32 templateId)
        external
        view
        returns (
            address airnode,
            bytes32 endpointId,
            bytes memory parameters
        );

    function templateIdToAirnode(bytes32 templateId)
        external
        view
        returns (address);

    // solhint-disable-next-line func-name-mixedcase
    function MAXIMUM_PARAMETER_LENGTH() external view returns (uint256);
}
