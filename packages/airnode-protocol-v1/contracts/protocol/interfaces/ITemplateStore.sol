// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ITemplateStore {
    event StoredTemplate(
        bytes32 indexed templateId,
        bytes32 endpointId,
        bytes parameters
    );

    function storeTemplate(bytes32 endpointId, bytes calldata parameters)
        external
        returns (bytes32 templateId);

    function templates(bytes32 templateId)
        external
        view
        returns (bytes32 endpointId, bytes memory parameters);

    // solhint-disable-next-line func-name-mixedcase
    function MAXIMUM_PARAMETER_LENGTH() external view returns (uint256);
}
