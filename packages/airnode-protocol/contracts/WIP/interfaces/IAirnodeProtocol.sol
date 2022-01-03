// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/interfaces/IAccessControlRegistryUser.sol";
import "../utils/interfaces/IWithdrawalUtils.sol";

interface IAirnodeProtocol is IAccessControlRegistryUser, IWithdrawalUtils {
    event CreatedTemplate(
        bytes32 indexed templateId,
        address airnode,
        bytes32 endpointId,
        bytes parameters
    );

    event CreatedSubscription(
        bytes32 indexed subscriptionId,
        bytes32 templateId,
        address reporter,
        address sponsor,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes parameters
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

    event FulfilledSubscription(bytes32 indexed subscriptionId, bytes data);

    function createTemplate(
        address airnode,
        bytes32 endpointId,
        bytes calldata parameters
    ) external returns (bytes32 templateId);

    function createSubscription(
        bytes32 templateId,
        address reporter,
        address sponsor,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 subscriptionId);

    function makeRequest(
        bytes32 templateId,
        address reporter,
        address sponsor,
        address sponsorWallet,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata parameters
    ) external returns (bytes32 requestId);

    function fulfillRequest(
        bytes32 requestId,
        address airnode,
        address reporter,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function failRequest(
        bytes32 requestId,
        address airnode,
        address reporter,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        string calldata errorMessage
    ) external;

    function fulfillSubscription(
        bytes32 subscriptionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData);

    function deriveSponsoredRequesterRole(address sponsor)
        external
        pure
        returns (bytes32 sponsoredRequesterRole);

    function requesterIsSponsoredOrIsSponsor(address sponsor, address requester)
        external
        view
        returns (bool);

    function requestIsAwaitingFulfillment(bytes32 requestId)
        external
        view
        returns (bool);

    // solhint-disable-next-line func-name-mixedcase
    function MAXIMUM_PARAMETER_LENGTH() external view returns (uint256);

    // solhint-disable-next-line func-name-mixedcase
    function SPONSORED_REQUESTER_ROLE_DESCRIPTION()
        external
        view
        returns (string memory);

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
            bytes32 templateId,
            address reporter,
            address sponsor,
            address fulfillAddress,
            bytes4 fulfillFunctionId,
            bytes memory parameters
        );

    function requesterToRequestCountPlusOne(address requester)
        external
        view
        returns (uint256 requestCount);
}
