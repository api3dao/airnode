// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IClientWhitelister {
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }

    struct WhitelistStatus {
        uint64 expirationTimestamp;
        bool whitelistPastExpiration;
    }

    event ExtendedWhitelistExpiration(
        bytes32 indexed serviceId,
        address indexed client,
        uint256 expiration,
        address indexed admin
    );

    event SetWhitelistExpiration(
        bytes32 indexed serviceId,
        address indexed client,
        uint256 expiration,
        address indexed admin
    );

    event SetWhitelistStatusPastExpiration(
        bytes32 indexed serviceId,
        address indexed client,
        bool status,
        address indexed admin
    );

    function extendWhitelistExpiration(
        bytes32 serviceId,
        address client,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistExpiration(
        bytes32 serviceId,
        address client,
        uint64 expirationTimestamp
    ) external;

    function setWhitelistStatusPastExpiration(
        bytes32 serviceId,
        address client,
        bool status
    ) external;

    function clientIsWhitelisted(bytes32 serviceId, address client)
        external
        view
        returns (bool isWhitelisted);

    function serviceIdToClientToWhitelistStatus(
        bytes32 serviceId,
        address client
    )
        external
        view
        returns (uint64 expirationTimestamp, bool whitelistPastExpiration);
}
