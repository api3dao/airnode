// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IWithdrawalUtils.sol";

interface IAirnode is IWithdrawalUtils {
    event CreatedTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
    );

    event SetSponsorshipStatus(
        address indexed sponsor,
        address indexed requester,
        bool sponsorshipStatus
    );

    event MadeRequest(
        address indexed reporter,
        bytes32 indexed requestId,
        uint256 requesterRequestCount,
        uint256 chainId,
        address requester,
        bytes32 templateId,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
    );

    event FulfilledRequest(
        address indexed reporter,
        bytes32 indexed requestId,
        bytes data
    );

    event FailedRequest(
        address indexed reporter,
        bytes32 indexed requestId,
        string errorMessage
    );

    event CreatedSubscription(
        bytes32 indexed subscriptionId,
        bytes32 templateId,
        address reporter,
        address sponsor,
        address conditionAddress,
        bytes4 conditionFunctionId,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
    );

    event FulfilledSubscription(bytes32 indexed subscriptionId, bytes data);
}
