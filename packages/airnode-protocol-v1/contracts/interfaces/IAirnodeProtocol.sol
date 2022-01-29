// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAirnodeWithdrawal.sol";

interface IAirnodeProtocol is IAirnodeWithdrawal {
    event SetSponsorshipStatus(
        address indexed sponsor,
        address indexed requester,
        bool sponsorshipStatus
    );

    event StoredTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
    );

    event RegisteredTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
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

    event StoredSubscription(
        bytes32 indexed subscriptionId,
        bytes32 templateId,
        bytes parameters,
        bytes conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    );

    function setSponsorshipStatus(address requester, bool sponsorshipStatus)
        external;

    function storeTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

    function registerTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

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

    function storeSubscription(
        bytes32 templateId,
        bytes calldata parameters,
        bytes calldata conditions,
        address relayer,
        address sponsor,
        address requester,
        bytes4 fulfillFunctionId
    ) external returns (bytes32 subscriptionId);

    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        returns (bool);

    function templates(bytes32 templateId)
        external
        view
        returns (
            address airnode,
            bytes32 endpointId,
            bytes memory parameters
        );

    function getBalances(address[] calldata accounts)
        external
        view
        returns (uint256[] memory balances);

    function sponsorToRequesterToSponsorshipStatus(
        address sponsor,
        address requester
    ) external view returns (bool sponsorshipStatus);

    function templateIdToAirnode(bytes32 templateId)
        external
        view
        returns (address);

    // solhint-disable-next-line func-name-mixedcase
    function MAXIMUM_PARAMETER_LENGTH() external view returns (uint256);

    function requesterToRequestCountPlusOne(address requester)
        external
        view
        returns (uint256);

    function subscriptions(bytes32 subscriptionId)
        external
        view
        returns (
            bytes32 templateId,
            bytes memory parameters,
            bytes memory conditions,
            address relayer,
            address sponsor,
            address requester,
            bytes4 fulfillFunctionId
        );
}
