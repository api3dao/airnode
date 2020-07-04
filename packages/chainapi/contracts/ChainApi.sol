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
    uint256 private noRequest = 0;

    event RequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 templateId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes parameters
        );

    event DirectRequestMade(
        bytes32 indexed providerId,
        bytes32 requestId,
        address requester,
        bytes32 endpointId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes parameters
        );

    event RequestFulfilled(
        bytes32 indexed providerId,
        bytes32 requestId,
        bytes32 data
        );

    /// @notice Called by the requester to make a request. It emits the request
    /// details as an event, which the provider node should be listening for
    /// @param providerId Provider ID from ProviderStore
    /// @param templateId Template ID from TemplateStore
    /// @param callbackAddress Address that will be called to deliver the
    /// response
    /// @param callbackFunctionId Signature of the function that will be called
    /// to deliver the response
    /// @param parameters Runtime parameters in addition to the ones defined in
    /// the template addressed by templateId
    /// @return requestId Request ID
    function makeRequest(
        bytes32 providerId,
        bytes32 templateId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes calldata parameters
        )
        external
        override
        onlyIfProviderIsValid(providerId)
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequest++,
            this
            ));
        requestIdToProviderId[requestId] = providerId;
        emit RequestMade(
            providerId,
            requestId,
            msg.sender,
            templateId,
            callbackAddress,
            callbackFunctionId,
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
    /// @param callbackAddress Address that will be called to deliver the
    /// response
    /// @param callbackFunctionId Signature of the function that will be called
    /// to deliver the response
    /// @param parameters Runtime parameters in addition to the ones defined in
    /// the template addressed by templateId
    /// @return requestId Request ID
    function makeDirectRequest(
        bytes32 providerId,
        bytes32 endpointId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes calldata parameters
        )
        external
        onlyIfProviderIsValid(providerId)
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(
            noRequest++,
            this
            ));
        requestIdToProviderId[requestId] = providerId;
        emit DirectRequestMade(
            providerId,
            requestId,
            msg.sender,
            endpointId,
            callbackAddress,
            callbackFunctionId,
            parameters
        );
    }

    /// @notice Called by the oracle node to fulfill requests
    /// @param callbackAddress Address that will be called to deliver the
    /// response
    /// @param callbackFunctionId Signature of the function that will be called
    /// to deliver the response
    /// @param requestId Request ID
    /// @param data Oracle response
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfillRequest(
        address callbackAddress,
        bytes4 callbackFunctionId,
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
        emit RequestFulfilled(
            providerId,
            requestId,
            data
            );
        (callSuccess, callData) = callbackAddress.call(
            abi.encodeWithSelector(callbackFunctionId, requestId, data)
            );
    }
}
