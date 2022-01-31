// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ITemplateStore.sol";

contract TemplateStore is ITemplateStore {
    struct PartialTemplate {
        bytes32 endpointId;
        bytes parameters;
    }

    /// @notice Maximum parameter length for templates, requests and
    /// subscriptions
    uint256 public constant override MAXIMUM_PARAMETER_LENGTH = 4096;

    mapping(bytes32 => address) public override templateIdToAirnode;

    mapping(bytes32 => PartialTemplate) private partialTemplates;

    /// @notice Stores a template record
    /// @dev Templates fully or partially define requests. By referencing a
    /// template, requesters can omit specifying the "boilerplate" sections of
    /// requests.
    /// Template, subscription and request IDs are hashes of their parameters.
    /// This means:
    /// (1) You can compute their expected IDs without creating them.
    /// (2) After querying their parameters with the respective ID, you can
    /// verify the integrity of the returned data by checking if they match the
    /// ID.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param parameters Template parameters
    /// @return templateId Template ID
    function storeTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external override returns (bytes32 templateId) {
        require(airnode != address(0), "Airnode address zero");
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        templateId = keccak256(
            abi.encodePacked(airnode, endpointId, parameters)
        );
        templateIdToAirnode[templateId] = airnode;
        partialTemplates[templateId] = PartialTemplate({
            endpointId: endpointId,
            parameters: parameters
        });
        emit StoredTemplate(templateId, airnode, endpointId, parameters);
    }

    /// @notice Registers a template record
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param parameters Template parameters
    /// @return templateId Template ID
    function registerTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external override returns (bytes32 templateId) {
        require(airnode != address(0), "Airnode address zero");
        templateId = keccak256(
            abi.encodePacked(airnode, endpointId, parameters)
        );
        templateIdToAirnode[templateId] = airnode;
        emit RegisteredTemplate(templateId, airnode, endpointId, parameters);
    }

    function getStoredTemplate(bytes32 templateId)
        external
        view
        override
        returns (
            address airnode,
            bytes32 endpointId,
            bytes memory parameters
        )
    {
        airnode = templateIdToAirnode[templateId];
        PartialTemplate storage partialTemplate = partialTemplates[templateId];
        endpointId = partialTemplate.endpointId;
        parameters = partialTemplate.parameters;
        require(
            templateId ==
                keccak256(abi.encodePacked(airnode, endpointId, parameters)),
            "Template not stored"
        );
    }
}
