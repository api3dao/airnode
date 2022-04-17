// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RrpRequesterV0.sol";

/// @title A mock Airnode RRP requester contract
contract MockRrpRequesterV0 is RrpRequesterV0 {
    event FulfilledRequest(bytes32 indexed requestId, bytes data);

    mapping(bytes32 => bytes) public requestIdToData;

    mapping(bytes32 => bool) private expectingRequestWithIdToBeFulfilled;

    /// @param airnodeRrpAddress Airnode RRP contract address
    constructor(address airnodeRrpAddress) RrpRequesterV0(airnodeRrpAddress) {}

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
    /// @param data Data returned by the Airnode
    function fulfill(bytes32 requestId, bytes calldata data)
        external
        onlyAirnodeRrp
    {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "No such request made"
        );
        delete expectingRequestWithIdToBeFulfilled[requestId];
        requestIdToData[requestId] = data;
        emit FulfilledRequest(requestId, data);
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment failure
    /// @param requestId Request ID
    /// @param data Data returned by the Airnode
    function fulfillAlwaysReverts(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        bytes calldata data // solhint-disable-line no-unused-vars
    ) external view onlyAirnodeRrp {
        revert("Always reverts");
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment failure
    /// @param requestId Request ID
    /// @param data Data returned by the Airnode
    function fulfillAlwaysRevertsWithNoString(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        bytes calldata data // solhint-disable-line no-unused-vars
    ) external view onlyAirnodeRrp {
        revert(); // solhint-disable-line reason-string
    }

    /// @notice A method to be called back by the respective method at
    /// AirnodeRrp.sol for testing fulfillment running out of gas
    /// @param requestId Request ID
    /// @param data Data returned by the Airnode
    function fulfillAlwaysRunsOutOfGas(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        bytes calldata data // solhint-disable-line no-unused-vars
    ) external view onlyAirnodeRrp {
        while (true) {}
    }

    /// @notice A wrapper for the respective method at AirnodeRrp.sol for
    /// testing
    /// @dev The withdrawal requested by calling this will revert because this
    /// contract does not implement a default payable method
    /// @param airnode Airnode address
    /// @param sponsorWallet Sponsor wallet that the withdrawal is requested
    /// from
    function requestWithdrawal(address airnode, address sponsorWallet)
        external
    {
        airnodeRrp.requestWithdrawal(airnode, sponsorWallet);
    }
}
