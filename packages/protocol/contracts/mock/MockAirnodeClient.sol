// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../AirnodeClient.sol";

/// @title A mock Airnode client contract
contract MockAirnodeClient is AirnodeClient {
    event RequestFulfilled(
        bytes32 requestId,
        uint256 statusCode,
        bytes data
        );

    mapping(bytes32 => bool) private incomingFulfillments;

    /// @param airnodeAddress Airnode contract address
    constructor (address airnodeAddress)
        public
        AirnodeClient(airnodeAddress)
    {}  // solhint-disable-line

    /// @notice A wrapper for the respective method at Airnode.sol for testing
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
    function makeRequest(
        bytes32 templateId,
        uint256 requesterIndex,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
    {
        bytes32 requestId = airnode.makeRequest(
            templateId,
            requesterIndex,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
            );
        incomingFulfillments[requestId] = true;
    }

    /// @notice A wrapper for the respective method at Airnode.sol for testing
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterIndex Requester index from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters All request parameters
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
    {
        bytes32 requestId = airnode.makeFullRequest(
            providerId,
            endpointId,
            requesterIndex,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
            );
        incomingFulfillments[requestId] = true;
    }

    /// @notice A method to be called back by the respective method at
    /// Airnode.sol for testing
    /// @param requestId Request ID
    /// @param statusCode Status code returned by the provider
    /// @param data Data returned by the provider
    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
        )
        external
        onlyAirnode()
    {
        require(incomingFulfillments[requestId], "No such request made");
        delete incomingFulfillments[requestId];
        emit RequestFulfilled(
            requestId,
            statusCode,
            data
            );
    }
}
