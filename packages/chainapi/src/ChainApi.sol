// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./EndpointStore.sol";
import "./TemplateStore.sol";


/// @title The contract used to make requests
/// @notice This can be seen as a common oracle contract. Requesters call it to
/// make requests and the nodes call it to fulfill these requests.
contract ChainApi is EndpointStore, TemplateStore {
    mapping(bytes32 => bytes32) private requestProviders;
    uint256 private noRequest = 0;

    event RequestMade(
        bytes32 indexed providerId,
        address requester,
        bytes32 requestId,
        bytes32 templateId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes parameters
        );

    /// @notice Announces an oracle request by emitting an event, which
    /// the provider node should be listening for.
    /// @param providerId Provider ID from ProviderStore
    /// @param templateId Template ID from TemplateStore
    /// @param callbackAddress Address that will be called to deliver the
    /// response
    /// @param callbackFunctionId ID of the function that will be called to
    /// deliver the response
    /// @param parameters Request parameters encoded in CBOR
    /// @return requestId Request ID
    function makeRequest(
        bytes32 providerId,
        bytes32 templateId,
        address callbackAddress,
        bytes4 callbackFunctionId,
        bytes calldata parameters
        )
        external
        payable
        onlyIfProviderIsValid(providerId)
        returns (bytes32 requestId)
    {
        requestId = keccak256(abi.encodePacked(noRequest++, this));
        requestProviders[requestId] = providerId;
        emit RequestMade(
            providerId,
            msg.sender,
            requestId,
            templateId,
            callbackAddress,
            callbackFunctionId,
            parameters
        );
    }

    /// @notice ...
    /// @param callbackAddress Address that will be called to deliver the
    /// response
    /// @param callbackFunctionId ID of the function that will be called to
    /// deliver the response
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
        require(
            this.getProviderWalletStatus(requestProviders[requestId], msg.sender),
            "Not a valid wallet of the provider"
        );
        delete requestProviders[requestId];
        (callSuccess, callData) = callbackAddress.call(
            abi.encodeWithSelector(callbackFunctionId, requestId, data)
            );
    }
}
