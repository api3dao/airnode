// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ISubscriptionStore.sol";
import "./IAirnodeWithdrawal.sol";

interface IAirnodeProtocol is ISubscriptionStore, IAirnodeWithdrawal {
    event SetSponsorshipStatus(
        address indexed sponsor,
        bytes32 indexed hash_,
        bool sponsorshipStatus
    );

    event MadeRequest(
        address indexed airnode,
        bytes32 indexed requestId,
        address requester,
        uint256 requesterRequestCount,
        bytes32 templateId,
        bytes parameters,
        address sponsor,
        bytes4 fulfillFunctionId
    );

    event FulfilledRequest(
        address indexed airnode,
        bytes32 indexed requestId,
        uint256 timestamp,
        bytes data
    );

    event FailedRequest(
        address indexed airnode,
        bytes32 indexed requestId,
        uint256 timestamp,
        string errorMessage
    );

    event MadeRequestRelayed(
        address indexed relayer,
        bytes32 indexed requestId,
        address indexed airnode,
        address requester,
        uint256 requesterRequestCount,
        bytes32 templateId,
        bytes parameters,
        address sponsor,
        bytes4 fulfillFunctionId
    );

    event FulfilledRequestRelayed(
        address indexed relayer,
        bytes32 indexed requestId,
        address indexed airnode,
        uint256 timestamp,
        bytes data
    );

    event FailedRequestRelayed(
        address indexed relayer,
        bytes32 indexed requestId,
        address indexed airnode,
        uint256 timestamp,
        string errorMessage
    );

    function setSponsorshipStatus(bytes32 hash_, bool sponsorshipStatus)
        external;

    function makeRequest(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor,
        bytes4 fulfillFunctionId
    ) external returns (bytes32 requestId);

    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function failRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external;

    function makeRequestRelayed(
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor,
        bytes4 fulfillFunctionId
    ) external returns (bytes32 requestId);

    function fulfillRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function failRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        bytes4 fulfillFunctionId,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external;

    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        returns (bool);

    function sponsorToHashToSponsorshipStatus(address sponsor, bytes32 hash_)
        external
        view
        returns (bool sponsorshipStatus);

    function requesterToRequestCount(address requester)
        external
        view
        returns (uint256);
}
