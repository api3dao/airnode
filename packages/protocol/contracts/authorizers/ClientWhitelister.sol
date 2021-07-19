// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RankedAdminnable.sol";
import "./interfaces/IClientWhitelister.sol";

/// @title Authorizer contract where clients are whitelisted until an
/// expiration time or indefinitely (until the whitelisting is revoked)
abstract contract ClientWhitelister is RankedAdminnable, IClientWhitelister {
    /// @notice Keeps the whitelisting statuses of clients for individual
    /// services (could be Airnodes, dAPIs, beacons, etc.)
    mapping(bytes32 => mapping(address => WhitelistStatus))
        public
        override serviceIdToClientToWhitelistStatus;

    /// @notice Called by an admin to extend the whitelist expiration of a
    /// client
    /// @param serviceId Service ID
    /// @param client Client
    /// @param expirationTimestamp Timestamp at which the client will no longer
    /// be whitelisted
    function extendWhitelistExpiration(
        bytes32 serviceId,
        address client,
        uint64 expirationTimestamp
    ) external override onlyWithRank(serviceId, uint256(AdminRank.Admin)) {
        require(
            expirationTimestamp >
                serviceIdToClientToWhitelistStatus[serviceId][client]
                .expirationTimestamp,
            "Expiration not extended"
        );
        serviceIdToClientToWhitelistStatus[serviceId][client]
        .expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            serviceId,
            client,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelisting expiration of a
    /// client
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten the expiration
    /// @param serviceId Service ID
    /// @param client Client
    /// @param expirationTimestamp Timestamp at which the whitelisting of the
    /// client will expire
    function setWhitelistExpiration(
        bytes32 serviceId,
        address client,
        uint64 expirationTimestamp
    ) external override onlyWithRank(serviceId, uint256(AdminRank.SuperAdmin)) {
        serviceIdToClientToWhitelistStatus[serviceId][client]
        .expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            serviceId,
            client,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a client
    /// past expiration
    /// @param serviceId Service ID
    /// @param client Client
    /// @param status Whitelist status that the client will have past expiration
    function setWhitelistStatusPastExpiration(
        bytes32 serviceId,
        address client,
        bool status
    ) external override onlyWithRank(serviceId, uint256(AdminRank.SuperAdmin)) {
        serviceIdToClientToWhitelistStatus[serviceId][client]
        .whitelistPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            serviceId,
            client,
            status,
            msg.sender
        );
    }
}
