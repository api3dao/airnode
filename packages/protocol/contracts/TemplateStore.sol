// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./interfaces/ITemplateStore.sol";

/// @title The contract where the request templates are stored
/// @notice Most requests are repeated many times with the same parameters.
/// This contract allows the requester to announce their parameters once, then
/// refer to that announcement to make a request instead of passing the same
/// parameters repeatedly.
contract TemplateStore is ITemplateStore {
    struct Template {
        bytes32 airnodeId;
        bytes32 endpointId;
        bytes parameters;
    }

    mapping(bytes32 => Template) internal templates;

    /// @notice Creates a request template with the given parameters,
    /// addressable by the ID it returns
    /// @dev A specific set of request parameters will always have
    /// the same ID. This means a few things: (1) You can compute the expected
    /// ID of a set of parameters off-chain, (2) creating a new template with
    /// the same parameters will overwrite the old one and return the same
    /// template ID, (3) after you query a template with its ID, you can verify
    /// its integrity by applying the hash and comparing the result with the
    /// ID.
    /// @param airnodeId Airnode ID from AirnodeParameterStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param parameters Static request parameters (i.e., parameters that will
    /// not change between requests, unlike the dynamic parameters determined
    /// at request-time)
    /// @return templateId Request template ID
    function createTemplate(
        bytes32 airnodeId,
        bytes32 endpointId,
        bytes calldata parameters
    ) external override returns (bytes32 templateId) {
        templateId = keccak256(abi.encode(airnodeId, endpointId, parameters));
        templates[templateId] = Template({
            airnodeId: airnodeId,
            endpointId: endpointId,
            parameters: parameters
        });
        emit TemplateCreated(templateId, airnodeId, endpointId, parameters);
    }

    /// @notice Retrieves the parameters of the request template addressed by
    /// the ID
    /// @param templateId Request template ID
    /// @return airnodeId Airnode ID from AirnodeParameterStore
    /// @return endpointId Endpoint ID from EndpointStore
    /// @return parameters Static request parameters (i.e., parameters that will
    /// not change between requests, unlike the dynamic parameters determined
    /// at request-time)
    function getTemplate(bytes32 templateId)
        external
        view
        override
        returns (
            bytes32 airnodeId,
            bytes32 endpointId,
            bytes memory parameters
        )
    {
        Template storage template = templates[templateId];
        airnodeId = template.airnodeId;
        endpointId = template.endpointId;
        parameters = template.parameters;
    }
}
