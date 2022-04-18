// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IWhitelistRolesWithManager.sol";

interface IWhitelistWithManager is IWhitelistRolesWithManager {
    event ExtendedWhitelistExpiration(
        bytes32 indexed serviceId,
        address indexed user,
        address indexed sender,
        uint256 expiration
    );

    event SetWhitelistExpiration(
        bytes32 indexed serviceId,
        address indexed user,
        address indexed sender,
        uint256 expiration
    );

    event SetIndefiniteWhitelistStatus(
        bytes32 indexed serviceId,
        address indexed user,
        address indexed sender,
        bool status,
        uint192 indefiniteWhitelistCount
    );

    event RevokedIndefiniteWhitelistStatus(
        bytes32 indexed serviceId,
        address indexed user,
        address indexed setter,
        address sender,
        uint192 indefiniteWhitelistCount
    );

    function extendWhitelistExpiration(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistExpiration(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) external;

    function setIndefiniteWhitelistStatus(
        bytes32 serviceId,
        address user,
        bool status
    ) external;

    function revokeIndefiniteWhitelistStatus(
        bytes32 serviceId,
        address user,
        address setter
    ) external;
}
