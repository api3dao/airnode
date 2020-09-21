// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/ITemplateStore.sol";


/// @title The contract where request templates are stored
/// @notice Most requests are repeated many times with the same parameters.
/// This contract allows the requester to announce their parameters once, then
/// refer to that announcement when they are making a request, instead of
/// passing the same parameters repeatedly.
contract TemplateStore is ITemplateStore {
    struct Template {
        bytes32 providerId;
        bytes32 endpointId;
        address fulfillAddress;
        address errorAddress;
        bytes4 fulfillFunctionId;
        bytes4 errorFunctionId;
        bytes parameters;
        }

    mapping(bytes32 => Template) internal templates;


    /// @notice Creates a template with the given parameters, addressable by
    /// the ID it returns
    /// @dev A specific set of request parameters will always have
    /// the same ID. This means that you can compute the expected ID of a set
    /// of parameters off-chain. It also means that creating a new template
    /// with the same parameters will overwrite the old one and return the
    /// same template ID.
    /// Note that the requester may choose to use a template, but not its
    /// fulfill/error destinations. For example, among the methods used to make
    /// individual requests in Airnode.sol, only makeShortRequest() uses these.
    /// In addition, the static parameters encoded in the template can be
    /// overriden by the dynamic parameters provided at runtime.
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param errorAddress Address that will be called to error
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorFunctionId Signature of the function that will be called
    /// to error
    /// @param parameters Static request parameters (i.e., parameters that will
    /// not change between requests, unlike the dynamic parameters determined
    /// at runtime)
    /// @return templateId Request template ID
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
        override
        returns (bytes32 templateId)
    {
        templateId = keccak256(abi.encodePacked(
            providerId,
            endpointId,
            fulfillAddress,
            errorAddress,
            fulfillFunctionId,
            errorFunctionId,
            parameters
            ));
        templates[templateId] = Template({
            providerId: providerId,
            endpointId: endpointId,
            fulfillAddress: fulfillAddress,
            errorAddress: errorAddress,
            fulfillFunctionId: fulfillFunctionId,
            errorFunctionId: errorFunctionId,
            parameters: parameters
        });
        emit TemplateCreated(
          templateId,
          providerId,
          endpointId,
          fulfillAddress,
          errorAddress,
          fulfillFunctionId,
          errorFunctionId,
          parameters
          );
    }

    /// @notice Retrieves request parameters addressed by the ID
    /// @param templateId Request template ID
    /// @return providerId Provider ID from ProviderStore
    /// @return endpointId Endpoint ID from EndpointStore
    /// @return fulfillAddress Address that will be called to fulfill
    /// @return errorAddress Address that will be called to error
    /// @return fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return errorFunctionId Signature of the function that will be called
    /// to error
    /// @return parameters Static request parameters (i.e., parameters that will
    /// not change between requests, unlike the dynamic parameters determined
    /// at runtime)
    function getTemplate(bytes32 templateId)
        external
        view
        override
        returns (
            bytes32 providerId,
            bytes32 endpointId,
            address fulfillAddress,
            address errorAddress,
            bytes4 fulfillFunctionId,
            bytes4 errorFunctionId,
            bytes memory parameters
        )
    {
        providerId = templates[templateId].providerId;
        endpointId = templates[templateId].endpointId;
        fulfillAddress = templates[templateId].fulfillAddress;
        errorAddress = templates[templateId].errorAddress;
        fulfillFunctionId = templates[templateId].fulfillFunctionId;
        errorFunctionId = templates[templateId].errorFunctionId;
        parameters = templates[templateId].parameters;
    }
}
