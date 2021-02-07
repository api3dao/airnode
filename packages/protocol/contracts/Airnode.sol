// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IAirnode.sol";
import "./ProviderStore.sol";
import "./TemplateStore.sol";


/// @title The contract used to make and fulfill requests
/// @notice Clients use this contract to make requests that follow a
/// request-response scheme. In addition, it inherits from contracts that keep
/// records of providers, requesters, endpoints, etc.
contract Airnode is ProviderStore, TemplateStore, IAirnode {
    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;
    mapping(bytes32 => bool) public requestWithIdHasFailed;
    uint256 private noRequests = 1;


    /// @notice Called by the client to make a regular request. A regular
    /// request refers to a template for the requester-agnostic parameters, but
    /// requires the client to provide the requester-specific parameters.
    /// @dev This is the recommended way of making a request in most cases. Use
    /// makeShortRequest() if gas efficiency is critical.
    /// @param templateId Template ID from TemplateStore
    /// @param requesterIndex Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeRequest(
        bytes32 templateId,
        uint256 requesterIndex,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        override
        returns (bytes32 requestId)
    {
        require(
            requesterIndexToClientAddressToEndorsementStatus[requesterIndex][msg.sender],
            "Client not endorsed by requester"
            );
        requestId = keccak256(abi.encode(
            noRequests,
            templateId,
            parameters
            ));
        bytes32 providerId = templates[templateId].providerId;
        requestIdToFulfillmentParameters[requestId] = keccak256(abi.encodePacked(
            providerId,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId
            ));
        emit ClientRequestCreated(
            providerId,
            requestId,
            noRequests,
            msg.sender,
            templateId,
            requesterIndex,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        noRequests++;
    }

    /// @notice Called by the requester to make a short request. A short
    /// request refers to a template, which the provider will use to get both
    /// requester-agnostic and requester-specific parameters
    /// @dev Use this if gas efficiency is critical
    /// @param templateId Template ID from TemplateStore
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
        override
        returns (bytes32 requestId)
    {
        Template storage template = templates[templateId];
        require(
            requesterIndexToClientAddressToEndorsementStatus[template.requesterIndex][msg.sender],
            "Client not endorsed by requester"
            );
        requestId = keccak256(abi.encode(
            noRequests,
            templateId,
            parameters
            ));
        requestIdToFulfillmentParameters[requestId] = keccak256(abi.encodePacked(
            template.providerId,
            template.designatedWallet,
            template.fulfillAddress,
            template.fulfillFunctionId
            ));
        emit ClientShortRequestCreated(
            templates[templateId].providerId,
            requestId,
            noRequests,
            msg.sender,
            templateId,
            parameters
        );
        noRequests++;
    }

    /// @notice Called by the requester to make a full request. A full request
    /// does not refer to a template, meaning that it passes all the parameters
    /// in the request. It does not require a template to be created
    /// beforehand, which provides extra flexibility compared to makeRequest()
    /// and makeShortRequest().
    /// @dev This is the least gas efficient way of making a request. Do not
    /// use it unless you have a good reason.
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterIndex Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters All request parameters
    /// @return requestId Request ID
    function makeFullRequest(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterIndex,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        override
        returns (bytes32 requestId)
    {
        require(
            requesterIndexToClientAddressToEndorsementStatus[requesterIndex][msg.sender],
            "Client not endorsed by requester"
            );
        requestId = keccak256(abi.encode(
            noRequests,
            providerId,
            endpointId,
            parameters
            ));
        requestIdToFulfillmentParameters[requestId] = keccak256(abi.encodePacked(
            providerId,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId
            ));
        emit ClientFullRequestCreated(
            providerId,
            requestId,
            noRequests,
            msg.sender,
            endpointId,
            requesterIndex,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        noRequests++;
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (including regular, short and full requests)
    /// @param requestId Request ID
    /// @param providerId Provider ID from ProviderStore
    /// @param statusCode Status code of the fulfillment
    /// @param data Fulfillment data
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        bytes32 requestId,
        bytes32 providerId,
        uint256 statusCode,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyCorrectFulfillmentParameters(
            requestId,
            providerId,
            fulfillAddress,
            fulfillFunctionId
            )
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        delete requestIdToFulfillmentParameters[requestId];
        emit ClientRequestFulfilled(
            providerId,
            requestId,
            statusCode,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(  // solhint-disable-line
            abi.encodeWithSelector(fulfillFunctionId, requestId, statusCode, data)
            );
    }

    /// @notice Called by the oracle node if a request cannot be fulfilled
    /// @dev The oracle should fall back to this if a request cannot be
    /// fulfilled because fulfill() reverts
    /// @param requestId Request ID
    /// @param providerId Provider ID from ProviderStore
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    function fail(
        bytes32 requestId,
        bytes32 providerId,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        onlyCorrectFulfillmentParameters(
            requestId,
            providerId,
            fulfillAddress,
            fulfillFunctionId
            )
    {
        delete requestIdToFulfillmentParameters[requestId];
        // Failure is recorded so that it can be checked externally
        requestWithIdHasFailed[requestId] = true;
        emit ClientRequestFailed(
            providerId,
            requestId
            );
    }

    /// @dev Reverts unless the incoming fulfillment parameters do not match
    /// the ones provided in the request
    /// @param requestId Request ID
    /// @param providerId Provider ID from ProviderStore
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    modifier onlyCorrectFulfillmentParameters(
        bytes32 requestId,
        bytes32 providerId,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
    {
        bytes32 incomingFulfillmentParameters = keccak256(abi.encodePacked(
            providerId,
            msg.sender,
            fulfillAddress,
            fulfillFunctionId
            ));
        require(
            incomingFulfillmentParameters == requestIdToFulfillmentParameters[requestId],
            "Incorrect fulfillment parameters"
            );
        _;
    }
}
