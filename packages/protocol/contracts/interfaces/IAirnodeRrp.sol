// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IAirnodeParameterStore.sol";
import "./ITemplateStore.sol";

interface IAirnodeRrp is IAirnodeParameterStore, ITemplateStore {
    event ClientRequestCreated(
        bytes32 indexed airnodeId,
        bytes32 indexed requestId,
        uint256 noRequests,
        uint256 chainId,
        address clientAddress,
        bytes32 templateId,
        address requester,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
    );

    event ClientFullRequestCreated(
        bytes32 indexed airnodeId,
        bytes32 indexed requestId,
        uint256 noRequests,
        uint256 chainId,
        address clientAddress,
        bytes32 endpointId,
        address requester,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
    );

    event ClientRequestFulfilled(
        bytes32 indexed airnodeId,
        bytes32 indexed requestId,
        uint256 statusCode,
        bytes data
    );

    event ClientRequestFailed(
        bytes32 indexed airnodeId,
        bytes32 indexed requestId
    );

    function makeRequest(
        bytes32 templateId,
        address requester,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 requestId);

    function makeFullRequest(
        bytes32 airnodeId,
        bytes32 endpointId,
        address requester,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 requestId);

    function fulfill(
        bytes32 requestId,
        bytes32 airnodeId,
        uint256 statusCode,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
    ) external returns (bool callSuccess, bytes memory callData);

    function fail(
        bytes32 requestId,
        bytes32 airnodeId,
        address fulfillAddress,
        bytes4 fulfillFunctionId
    ) external;
}
