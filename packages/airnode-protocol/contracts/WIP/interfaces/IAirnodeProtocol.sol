// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../utils/interfaces/IWithdrawalUtils.sol";

interface IAirnodeProtocol is IWithdrawalUtils {
    event SetSponsorshipStatus(
        address indexed sponsor,
        address indexed requester,
        bool sponsorshipStatus
    );

    event CreatedTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
    );

    event CreatedSubscription(
        bytes32 indexed subscriptionId,
        bytes32 requestHash,
        bytes32 templateId,
        bytes parameters,
        address sponsor,
        address requester
    );

    event MadeRequest(
        address indexed airnode,
        bytes32 indexed requestId,
        address requester,
        uint256 requesterRequestCount,
        bytes32 templateId,
        bytes parameters,
        address sponsor
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

    event FulfilledSubscription(
        address indexed airnode,
        bytes32 indexed subscriptionId,
        uint256 timestamp,
        bytes data
    );

    function setSponsorshipStatus(address requester, bool sponsorshipStatus)
        external;

    function createTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

    function createSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor,
        address requester
    ) external returns (bytes32 subscriptionId);

    function makeRequest(
        bytes32 templateId,
        bytes calldata parameters,
        address sponsor
    ) external returns (bytes32 requestId);

    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function failRequest(
        bytes32 requestId,
        address airnode,
        address requester,
        uint256 timestamp,
        string calldata errorMessage,
        bytes calldata signature
    ) external;

    function fulfillSubscription(
        bytes32 subscriptionId,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function verifyData(
        bytes32 templateId,
        bytes calldata parameters,
        uint256 timestamp,
        bytes calldata data,
        bytes calldata signature
    ) external view returns (address airnode, bytes32 requestHash);

    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        returns (bool);

    function sponsorToRequesterToSponsorshipStatus(
        address sponsor,
        address requester
    ) external view returns (bool sponsorshipStatus);

    function templates(bytes32 templateId)
        external
        view
        returns (
            address airnode,
            bytes32 endpointId,
            bytes memory parameters
        );

    function subscriptions(bytes32 subscriptionId)
        external
        view
        returns (
            bytes32 requestHash,
            bytes32 templateId,
            bytes memory parameters,
            address sponsor,
            address requester
        );

    // solhint-disable-next-line func-name-mixedcase
    function MAXIMUM_PARAMETER_LENGTH() external view returns (uint256);

    function requesterToRequestCountPlusOne(address requester)
        external
        view
        returns (uint256);
}
