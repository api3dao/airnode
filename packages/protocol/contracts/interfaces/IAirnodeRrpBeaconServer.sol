// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IAirnodeRrpBeaconServer {
    event RequestedBeaconUpdate(
        bytes32 indexed templateId,
        address indexed requester,
        address designatedWallet,
        address indexed caller,
        bytes32 requestId
    );

    event FulfilledBeaconUpdate(
        bytes32 indexed templateId,
        bytes32 requestId,
        int224 value,
        uint32 timestamp
    );

    event ErroredBeaconUpdate(
        bytes32 indexed templateId,
        bytes32 requestId,
        uint256 statusCode
    );
}
