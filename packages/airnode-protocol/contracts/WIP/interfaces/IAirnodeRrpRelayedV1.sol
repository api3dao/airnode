// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodeRrpV1.sol";

interface IAirnodeRrpRelayedV1 is IAirnodeRrpV1 {
    event MadeRequestRelayed(
        address indexed relayer,
        bytes32 indexed requestId,
        address requester,
        uint256 requesterRequestCount,
        bytes32 templateId,
        bytes parameters,
        address sponsor
    );

    event FulfilledRequestRelayed(
        address indexed relayer,
        bytes32 indexed requestId,
        uint256 timestamp,
        bytes data
    );

    event FailedRequestRelayed(
        address indexed relayer,
        bytes32 indexed requestId,
        uint256 timestamp,
        string errorMessage
    );

    function makeRequestRelayed(
        bytes32 templateId,
        bytes calldata parameters,
        address relayer,
        address sponsor
    ) external returns (bytes32 requestId);

    function fulfillRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function failRequestRelayed(
        bytes32 requestId,
        address airnode,
        address requester,
        address relayer,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external;
}
