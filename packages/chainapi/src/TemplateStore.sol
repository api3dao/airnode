// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


/// @title The contract where request templates are stored
/// @notice Most requests are repeated many times with the same parameters.
/// This contract allows the requester to announce their parameters once, then
/// refer to that announcement when they are making a request, instead of
/// passing the same parameters over and over again.
contract TemplateStore {
    struct Template {
        bytes32 endpointId;
        uint gasLimit;
        bytes parameters;
    }

    mapping(bytes32 => Template) private templates;

    event TemplateCreated(bytes32 indexed id);

    /// @notice Creates a template with the given parameters, addressable by
    /// the ID it returns
    /// @dev A specific set of request parameters will always have
    /// the same ID. This means that you can compute the expected ID of a set
    /// of parameters off-chain. It also means that creating a new template
    /// with the same parameters will overwrite the old one and return the
    /// same template ID.
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param gasLimit Gas limit to be used to fulfill the request
    /// @param parameters Parameters encoded in CBOR
    /// @return templateId Request template ID
    function createTemplate(
        bytes32 endpointId,
        uint gasLimit,
        bytes calldata parameters
        )
        external
        returns (bytes32 templateId)
    {
        templateId = keccak256(
            abi.encodePacked(
                endpointId,
                gasLimit,
                parameters
                )
        );
        templates[templateId] = Template({
            endpointId: endpointId,
            gasLimit: gasLimit,
            parameters: parameters
        });
        emit TemplateCreated(templateId);
    }

    /// @notice Retrieves request parameters addressed by the ID
    /// @param templateId Request template ID
    /// @return endpointId Endpoint ID from EndpointStore
    /// @return gasLimit Gas limit used to fulfill the request
    /// @return parameters Parameters encoded in CBOR
    function getTemplate(bytes32 templateId)
        external
        view
        returns (
            bytes32 endpointId,
            uint gasLimit,
            bytes memory parameters
        )
    {
        endpointId = templates[templateId].endpointId;
        gasLimit = templates[templateId].gasLimit;
        parameters = templates[templateId].parameters;
    }
}
