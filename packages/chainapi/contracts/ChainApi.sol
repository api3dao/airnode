// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/ChainApiInterface.sol";
import "./EndpointStore.sol";
import "./TemplateStore.sol";


/// @title The contract used to make and fulfill requests
/// @notice This can be seen as a common oracle contract. Requesters call it to
/// make requests and the nodes call it to fulfill these requests.
contract ChainApi is EndpointStore, TemplateStore, ChainApiInterface {
    mapping(bytes32 => bytes32) private requestIdToProviderId;
    mapping(bytes32 => bool) private requestWithIdHasFailed;
    uint256 private noRequests = 0;

    event RequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 templateId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes parameters
        );

    event DirectRequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 endpointId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes parameters
        );

    event FulfillmentSuccessful(
        bytes32 indexed providerId,
        bytes32 requestId,
        bytes32 data
        );

    event FulfillmentErrored(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 errorCode
        );

    event FulfillmentFailed(
        bytes32 indexed providerId,
        bytes32 requestId
        );

    /// @notice Called by the requester to make a request. It emits the request
    /// details as an event, which the provider node should be listening for
    /// @param providerId Provider ID from ProviderStore
    /// @param templateId Template ID from TemplateStore
    /// @param fulfillAddress Address that will be called to deliver the
    /// response
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to deliver the response
    /// @param errorAddress Address that will be called to if fulfillment fails
    /// @param errorFunctionId Signature of the function that will be called
    /// if the fulfillment fails
    /// @param parameters Runtime parameters in addition to the ones defined in
    /// the template addressed by templateId
    /// @return requestId Request ID
    function makeRequest(
        bytes32 providerId,
        bytes32 templateId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        override
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this
            ));
        requestIdToProviderId[requestId] = providerId;
        emit RequestMade(
            providerId,
            requestId,
            msg.sender,
            templateId,
            fulfillAddress,
            fulfillFunctionId,
            errorAddress,
            errorFunctionId,
            parameters
        );
    }

    /// @notice Called by the requester to make a request. It emits the request
    /// details as an event, which the provider node should be listening for.
    /// @dev Since makeDirectRequest refers to the endpointId directly (instead
    /// of referring to a template that refers to an endpoint), it requires the
    /// requester to pass all parameters here.
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param fulfillAddress Address that will be called to deliver the
    /// response
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to deliver the response
    /// @param errorAddress Address that will be called to if fulfillment fails
    /// @param errorFunctionId Signature of the function that will be called
    /// if the fulfillment fails
    /// @param parameters Request parameters
    /// @return requestId Request ID
    function makeDirectRequest(
        bytes32 providerId,
        bytes32 endpointId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        address errorAddress,
        bytes4 errorFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequests++,
            this
            ));
        requestIdToProviderId[requestId] = providerId;
        emit DirectRequestMade(
            providerId,
            requestId,
            msg.sender,
            endpointId,
            fulfillAddress,
            fulfillFunctionId,
            errorAddress,
            errorFunctionId,
            parameters
        );
    }

    /// @notice Called by the oracle node to fulfill requests
    /// @param fulfillAddress Address that will be called to deliver the
    /// response
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to deliver the response
    /// @param requestId Request ID
    /// @param data Oracle response
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes32 requestId,
        bytes32 data
        )
        external
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

    /// @notice Called by the oracle node if the request could not be fulfilled
    /// for any reason
    /// @param errorAddress Address that will be called
    /// @param errorFunctionId Signature of the function that will be called
    /// @param requestId Request ID
    /// @param errorCode Error code
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function error(
        address errorAddress,
        bytes4 errorFunctionId,
        bytes32 requestId,
        uint256 errorCode
        )
        external
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

    /// @notice Called by the oracle node if the request could neither be fulfilled
    /// nor errored
    /// @dev This node should fall back to this if a request cannot be fulfilled
    /// and error() is reverting
    /// @param requestId Request ID
    function fail(bytes32 requestId)
        external
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

    /// @notice Used to check if a request had to fail because it could not be
    /// fulfilled or errored
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
