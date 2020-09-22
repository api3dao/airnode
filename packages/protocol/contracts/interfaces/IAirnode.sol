// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IEndpointStore.sol";
import "./ITemplateStore.sol";


interface IAirnode is IEndpointStore, ITemplateStore {
    event ClientRequestCreated(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 noRequests,
        address requester,
        bytes32 templateId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
        );

    event ClientShortRequestCreated(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 noRequests,
        address requester,
        bytes32 templateId,
        bytes parameters
        );

    event ClientFullRequestCreated(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 noRequests,
        address requester,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
        );

    event ClientRequestFulfilled(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 statusCode,
        bytes32 data
        );

    event ClientRequestFulfilledWithBytes(
        bytes32 indexed providerId,
        bytes32 requestId,
        uint256 statusCode,
        bytes data
        );

    event ClientRequestFailed(
        bytes32 indexed providerId,
        bytes32 requestId
        );

    function makeRequest(
        bytes32 templateId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

    function makeShortRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

    function makeFullRequest(
        bytes32 providerId,
        bytes32 endpointId,
        uint256 requesterInd,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

    function fulfill(
        bytes32 requestId,
        bytes32 providerId,
        uint256 statusCode,
        bytes32 data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function fulfillBytes(
        bytes32 requestId,
        bytes32 providerId,
        uint256 statusCode,
        bytes calldata data,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external
        returns(
            bool callSuccess,
            bytes memory callData
        );

    function fail(
        bytes32 requestId,
        bytes32 providerId,
        address fulfillAddress,
        bytes4 fulfillFunctionId
        )
        external;
}
