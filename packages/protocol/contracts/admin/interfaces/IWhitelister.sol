// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRankedAdminnable.sol";

interface IWhitelister is IRankedAdminnable{
    event ExtendedWhitelistExpiration(
        bytes32 indexed serviceId,
        address indexed user,
        uint256 expiration,
        address indexed admin
    );

    event SetWhitelistExpiration(
        bytes32 indexed serviceId,
        address indexed user,
        uint256 expiration,
        address indexed admin
    );

    event SetWhitelistStatusPastExpiration(
        bytes32 indexed serviceId,
        address indexed user,
        bool status,
        address indexed admin
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

    function setWhitelistStatusPastExpiration(
        bytes32 serviceId,
        address user,
        bool status
    ) external;

    function userIsWhitelisted(bytes32 serviceId, address user)
        external
        view
        returns (bool isWhitelisted);

    function serviceIdToUserToWhitelistStatus(bytes32 serviceId, address user)
        external
        view
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration);
}
