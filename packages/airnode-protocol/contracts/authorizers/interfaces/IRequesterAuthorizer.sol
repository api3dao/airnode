// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAuthorizer.sol";

interface IRequesterAuthorizer is IAuthorizer {
    event ExtendedWhitelistExpiration(
        address indexed airnode,
        bytes32 endpointId,
        address indexed requester,
        address indexed sender,
        uint256 expiration
    );

    event SetWhitelistExpiration(
        address indexed airnode,
        bytes32 endpointId,
        address indexed requester,
        address indexed sender,
        uint256 expiration
    );

    event SetIndefiniteWhitelistStatus(
        address indexed airnode,
        bytes32 endpointId,
        address indexed requester,
        address indexed sender,
        bool status,
        uint192 indefiniteWhitelistCount
    );

    event RevokedIndefiniteWhitelistStatus(
        address indexed airnode,
        bytes32 endpointId,
        address indexed requester,
        address indexed setter,
        address sender,
        uint192 indefiniteWhitelistCount
    );

    function extendWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address requester,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address requester,
        uint64 expirationTimestamp
    ) external;

    function setIndefiniteWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address requester,
        bool status
    ) external;

    function revokeIndefiniteWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address requester,
        address setter
    ) external;

    function requesterIsWhitelisted(
        address airnode,
        bytes32 endpointId,
        address requester
    ) external view returns (bool isWhitelisted);

    function airnodeToEndpointIdToRequesterToWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address requester
    )
        external
        view
        returns (uint64 expirationTimestamp, uint192 indefiniteWhitelistCount);

    function airnodeToEndpointIdToRequesterToSetterToIndefiniteWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address requester,
        address setter
    ) external view returns (bool indefiniteWhitelistStatus);
}
