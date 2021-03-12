// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./IProviderStore.sol";
import "./ITemplateStore.sol";

interface IAirnodeRrp is IProviderStore, ITemplateStore {
    event ClientRequestCreated(
        bytes32 indexed providerId,
        bytes32 indexed requestId,
        uint256 noRequests,
        address clientAddress,
        bytes32 templateId,
        uint256 requesterIndex,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
        );

    event ClientFullRequestCreated(
        bytes32 indexed providerId,
        bytes32 indexed requestId,
        uint256 noRequests,
        address clientAddress,
        bytes32 endpointId,
        uint256 requesterIndex,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
        );

    event ClientRequestFulfilled(
        bytes32 indexed providerId,
        bytes32 indexed requestId,
        uint256 statusCode,
        bytes data
        );

    event ClientRequestFailed(
        bytes32 indexed providerId,
        bytes32 indexed requestId
        );

    function makeRequest(
        bytes32 templateId,
        uint256 requesterIndex,
        address designatedWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
        )
        external
        returns (bytes32 requestId);

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
        returns (bytes32 requestId);

    function fulfill(
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
