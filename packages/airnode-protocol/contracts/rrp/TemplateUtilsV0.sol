// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/ITemplateUtilsV0.sol";

/// @title Contract that implements request templates
contract TemplateUtilsV0 is ITemplateUtilsV0 {
    struct Template {
        address airnode;
        bytes32 endpointId;
        bytes parameters;
    }

    /// @notice Called to get a template
    mapping(bytes32 => Template) public override templates;

    /// @notice Creates a request template with the given parameters,
    /// addressable by the ID it returns
    /// @dev A specific set of request parameters will always have the same
    /// template ID. This means a few things: (1) You can compute the expected
    /// ID of a template before creating it, (2) Creating a new template with
    /// the same parameters will overwrite the old one and return the same ID,
    /// (3) After you query a template with its ID, you can verify its
    /// integrity by applying the hash and comparing the result with the ID.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param parameters Static request parameters (i.e., parameters that will
    /// not change between requests, unlike the dynamic parameters determined
    /// at request-time)
    /// @return templateId Request template ID
    function createTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external override returns (bytes32 templateId) {
        require(airnode != address(0), "Airnode address zero");
        templateId = keccak256(
            abi.encodePacked(airnode, endpointId, parameters)
        );
        templates[templateId] = Template({
            airnode: airnode,
            endpointId: endpointId,
            parameters: parameters
        });
        emit CreatedTemplate(templateId, airnode, endpointId, parameters);
    }

    /// @notice A convenience method to retrieve multiple templates with a
    /// single call
    /// @dev Does not revert if the templates being indexed do not exist
    /// @param templateIds Request template IDs
    /// @return airnodes Array of Airnode addresses
    /// @return endpointIds Array of endpoint IDs
    /// @return parameters Array of request parameters
    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        override
        returns (
            address[] memory airnodes,
            bytes32[] memory endpointIds,
            bytes[] memory parameters
        )
    {
        airnodes = new address[](templateIds.length);
        endpointIds = new bytes32[](templateIds.length);
        parameters = new bytes[](templateIds.length);
        for (uint256 ind = 0; ind < templateIds.length; ind++) {
            Template storage template = templates[templateIds[ind]];
            airnodes[ind] = template.airnode;
            endpointIds[ind] = template.endpointId;
            parameters[ind] = template.parameters;
        }
    }
}
