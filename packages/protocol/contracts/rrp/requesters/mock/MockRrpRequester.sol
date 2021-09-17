// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../RrpRequester.sol";

/// @title A mock Airnode RRP requester contract
contract MockRrpRequester is RrpRequester {
    event FulfilledRequest(
        bytes32 indexed requestId,
        uint256 statusCode,
        bytes data
    );

    mapping(bytes32 => uint256) public requestIdToStatusCode;
    mapping(bytes32 => bytes) public requestIdToData;

    mapping(bytes32 => bool) private expectingRequestWithIdToBeFulfilled;

    /// @param airnodeRrpAddress Airnode RRP contract address
    constructor(address airnodeRrpAddress) RrpRequester(airnodeRrpAddress) {}

    /// @notice A wrapper for the respective method at AirnodeRrp.sol for
    /// testing
    /// @param templateId Template ID
    /// @param sponsor Sponsor address
    /// @param sponsorWallet Sponsor wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters Parameters provided by the requester in addition to
    /// the parameters in the template
    function makeTemplateRequest(
        bytes32 templateId,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external {
        bytes32 requestId = airnodeRrp.makeTemplateRequest(
            templateId,
            sponsor,
            sponsorWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
    }

    /// @notice A wrapper for the respective method at AirnodeRrp.sol for
    /// testing
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param sponsor Sponsor address
    /// @param sponsorWallet Sponsor wallet that is requested to fulfill
    /// the request
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @param parameters All request parameters
    function makeFullRequest(
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointId,
            sponsor,
            sponsorWallet,
            fulfillAddress,
            fulfillFunctionId,
            parameters
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
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
    ) external onlyAirnodeRrp {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "No such request made"
        );
        delete expectingRequestWithIdToBeFulfilled[requestId];
        requestIdToStatusCode[requestId] = statusCode;
        requestIdToData[requestId] = data;
        emit FulfilledRequest(requestId, statusCode, data);
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment failure
    /// @param requestId Request ID
    /// @param statusCode Status code returned by the Airnode
    /// @param data Data returned by the Airnode
    function fulfillAlwaysReverts(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        uint256 statusCode, // solhint-disable-line no-unused-vars
        bytes calldata data // solhint-disable-line no-unused-vars
    ) external view onlyAirnodeRrp {
        revert("Always reverts");
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment running out of gas
    /// @param requestId Request ID
    /// @param statusCode Status code returned by the Airnode
    /// @param data Data returned by the Airnode
    function fulfillAlwaysRunsOutOfGas(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        uint256 statusCode, // solhint-disable-line no-unused-vars
        bytes calldata data // solhint-disable-line no-unused-vars
    ) external view onlyAirnodeRrp {
        while (true) {}
    }
}
