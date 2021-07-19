// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../AirnodeRrpClient.sol";

/// @title A mock Airnode RRP client contract
contract MockAirnodeRrpClient is AirnodeRrpClient {
    event RequestFulfilled(bytes32 requestId, uint256 statusCode, bytes data);

    mapping(bytes32 => bool) private incomingFulfillments;

    /// @param airnodeRrpAddress Airnode RRP contract address
    constructor(address airnodeRrpAddress)
        AirnodeRrpClient(airnodeRrpAddress)
    {} // solhint-disable-line

    /// @notice A wrapper for the respective method at AirnodeRrp.sol for
    /// testing
    /// @param templateId Template ID from TemplateStore
    /// @param requester Requester from RequesterStore
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
        address requester,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external {
        bytes32 requestId = airnodeRrp.makeRequest(
            templateId,
            requester,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        incomingFulfillments[requestId] = true;
    }

    /// @notice A wrapper for the respective method at AirnodeRrp.sol for
    /// testing
    /// @param airnodeId Airnode ID from AirnodeParameterStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requester Requester from RequesterStore
    /// @param designatedWallet Designated wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters All request parameters
    function makeFullRequest(
        bytes32 airnodeId,
        bytes32 endpointId,
        address requester,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnodeId,
            endpointId,
            requester,
            designatedWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        incomingFulfillments[requestId] = true;
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing
    /// @param requestId Request ID
    /// @param statusCode Status code returned by the Airnode
    /// @param data Data returned by the Airnode
    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes calldata data
    ) external onlyAirnodeRrp() {
        require(incomingFulfillments[requestId], "No such request made");
        delete incomingFulfillments[requestId];
        emit RequestFulfilled(requestId, statusCode, data);
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment failure
    /// @param /* requestId */ Request ID
    /// @param /* statusCode */ Status code returned by the Airnode
    /// @param /* data */ Data returned by the Airnode
    function fulfillAlwaysReverts(
        bytes32, /* requestId */
        uint256, /* statusCode */
        bytes calldata /* data */
    ) external view onlyAirnodeRrp() {
        revert("Expected revert");
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment running out of gas
    /// @param /* requestId */ Request ID
    /// @param /* statusCode */ Status code returned by the Airnode
    /// @param /* data */ Data returned by the Airnode
    function fulfillAlwaysRunsOutOfGas(
        bytes32, /* requestId */
        uint256, /* statusCode */
        bytes calldata /* data */
    ) external view onlyAirnodeRrp() {
        while (true) {}
        // solhint-disable-previous-line no-empty-blocks
    }
}
