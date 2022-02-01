// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./interfaces/ITemplateStore.sol";

contract TemplateStore is ITemplateStore {
    struct Template {
        bytes32 endpointId;
        bytes parameters;
    }

    /// @notice Maximum parameter length for templates, requests and
    /// subscriptions
    uint256 public constant override MAXIMUM_PARAMETER_LENGTH = 4096;

    mapping(bytes32 => Template) public templates;

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
    /// @param endpointId Endpoint ID (allowed to be `bytes32(0)`)
    /// @param parameters Template parameters
    /// @return templateId Template ID
    function storeTemplate(bytes32 endpointId, bytes calldata parameters)
        external
        override
        returns (bytes32 templateId)
    {
        require(
            parameters.length <= MAXIMUM_PARAMETER_LENGTH,
            "Parameters too long"
        );
        templateId = keccak256(abi.encodePacked(endpointId, parameters));
        templates[templateId] = Template({
            endpointId: endpointId,
            parameters: parameters
        });
        emit StoredTemplate(templateId, endpointId, parameters);
    }
}
