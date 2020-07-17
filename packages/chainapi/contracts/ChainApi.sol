// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/ChainApiInterface.sol";
import "./EndpointStore.sol";
import "./TemplateStore.sol";


/// @title The contract used to make and fulfill individual requests
/// @notice Clients use this contract to make requests that follow a
/// request-fulfill cycle. In addition, it inherits from contracts that keep
/// records of providers, requesters, endpoints, etc.
contract ChainApi is EndpointStore, TemplateStore, ChainApiInterface {
    mapping(bytes32 => bytes32) private requestIdToProviderId;
    mapping(bytes32 => bool) private requestWithIdHasFailed;
    uint256 private noRequests = 0;


    /// @notice Called by the requester to make a regular request. A regular
    /// request refers to a template, yet requires the provider to ignore its
    /// fulfill/error destinations and use the parameters supplied along with
    /// the request.
    /// @dev This is the recommended way of making a request in most cases. Use
    /// makeShortRequest() if gas efficiency is critical.
    /// @param templateId Template ID from TemplateStore
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param errorAddress Address that will be called if fulfillment fails
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorFunctionId Signature of the function that will be called
    /// if fulfillment fails
    /// @param parameters Dynamic request parameters (i.e., parameters that are
    /// determined at runtime, unlike the static parameters stored in the
    /// template)
    /// @return requestId Request ID
    function makeRequest(
        bytes32 templateId,
        address fulfillAddress,
        address errorAddress,
        bytes4 fulfillFunctionId,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        override
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        bytes32 providerId = templates[templateId].providerId;
        requestIdToProviderId[requestId] = providerId;
        emit RequestMade(
            providerId,
            requestId,
            msg.sender,
            templateId,
            fulfillAddress,
            errorAddress,
            fulfillFunctionId,
            errorFunctionId,
            parameters
        );
    }

    /// @notice Called by the requester to make a short request. A regular
    /// request refers to a template, which the provider will get all parameters
    /// from (including fulfill/error destinations). This is the most gas
    /// efficient method making an individual request.
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
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        bytes32 providerId = templates[templateId].providerId;
        requestIdToProviderId[requestId] = providerId;
        emit ShortRequestMade(
            providerId,
            requestId,
            msg.sender,
            templateId,
            parameters
        );
    }

    /// @notice Called by the requester to make a full request. It does not
    /// refer to a template, meaning that it passes all the parameters in the
    /// request. It does not require a template to be created beforehand,
    /// which provides extra flexibility compared to makeRequest() and
    /// makeShortRequest().
    /// @dev This is the least gas efficient way of making a request. Do not
    /// use it unless you have a good reason.
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param errorAddress Address that will be called if fulfillment fails
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param errorFunctionId Signature of the function that will be called
    /// if fulfillment fails
    /// @param parameters All request parameters
    /// @return requestId Request ID
    function makeFullRequest(
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
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this,
            msg.sender
            ));
        requestIdToProviderId[requestId] = providerId;
        emit FullRequestMade(
            providerId,
            requestId,
            msg.sender,
            endpointId,
            fulfillAddress,
            errorAddress,
            fulfillFunctionId,
            errorFunctionId,
            parameters
        );
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (inclusing regular, short and full requests)
    /// @param requestId Request ID
    /// @param data Oracle response
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        bytes32 requestId,
        bytes32 data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        bytes32 providerId = requestIdToProviderId[requestId];
        require(
            this.getProviderWalletStatus(providerId, msg.sender),
            "Not a valid wallet of the provider"
            );
        delete requestIdToProviderId[requestId];
        emit FulfillmentSuccessful(
            providerId,
            requestId,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
            );
    }

    /// @notice Called by the oracle node to fulfill individual requests
    /// (inclusing regular, short and full requests) with a bytes type response
    /// @dev The oracle uses this method to fulfill if the requester has
    /// specifically asked for a bytes type response
    /// @param requestId Request ID
    /// @param data Oracle response of type bytes
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillBytes(
        bytes32 requestId,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        override
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        bytes32 providerId = requestIdToProviderId[requestId];
        require(
            this.getProviderWalletStatus(providerId, msg.sender),
            "Not a valid wallet of the provider"
            );
        delete requestIdToProviderId[requestId];
        emit FulfillmentBytesSuccessful(
            providerId,
            requestId,
            data
            );
        (callSuccess, callData) = fulfillAddress.call(
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
            );
    }

    /// @notice Called by the oracle node if a request could not be fulfilled
    /// for any reason
    /// @dev The oracle may specify the error using errorCode. The specification
    /// format is outside the scope of this contract. Refer to the specific
    /// oracle documentations for more information.
    /// @param requestId Request ID
    /// @param errorCode Error code
    /// @param errorAddress Address that will be called
    /// @param errorFunctionId Signature of the function that will be called
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function error(
        bytes32 requestId,
        uint256 errorCode,
        address errorAddress,
        bytes4 errorFunctionId
        )
        external
        override
        returns(
            bool callSuccess,
            bytes memory callData
        )
    {
        bytes32 providerId = requestIdToProviderId[requestId];
        require(
            this.getProviderWalletStatus(providerId, msg.sender),
            "Not a valid wallet of the provider"
            );
        delete requestIdToProviderId[requestId];
        emit FulfillmentErrored(
            providerId,
            requestId,
            errorCode
            );
        (callSuccess, callData) = errorAddress.call(
            abi.encodeWithSelector(errorFunctionId, requestId, errorCode)
            );
    }

    /// @notice Called by the oracle node if a request could neither be fulfilled
    /// nor errored
    /// @dev The oracle should fall back to this if a request cannot be fulfilled
    /// and error() is reverting
    /// @param requestId Request ID
    function fail(bytes32 requestId)
        external
        override
    {
        bytes32 providerId = requestIdToProviderId[requestId];
        require(
            this.getProviderWalletStatus(providerId, msg.sender),
            "Not a valid wallet of the provider"
            );
        delete requestIdToProviderId[requestId];
        // Failure is recorded so that it can be checked externally with
        // checkIfRequestHasFailed()
        requestWithIdHasFailed[requestId] = true;
        emit FulfillmentFailed(
            providerId,
            requestId
            );
    }

    /// @notice Used to check if a request has failed because it could neither
    /// be fulfilled nor errored
    /// @param requestId Request ID
    /// @return status If the request has failed
    function checkIfRequestHasFailed(bytes32 requestId)
        external
        view
        returns(bool status)
    {
        status = requestWithIdHasFailed[requestId];
    }
}
