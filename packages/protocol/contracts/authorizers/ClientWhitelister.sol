// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RankedAdminnable.sol";
import "./interfaces/IClientWhitelister.sol";

/// @title Authorizer contract where clients are whitelisted until an
/// expiration time or indefinitely (until the whitelisting is revoked)
contract ClientWhitelister is RankedAdminnable, IClientWhitelister {
    /// @notice Keeps the whitelisting statuses of clients for individual
    /// services (could be Airnodes, dAPIs, beacons, etc.)
    mapping(bytes32 => mapping(address => WhitelistStatus))
        public
        override serviceIdToClientToWhitelistStatus;

    /// @dev Reverts if the caller is not whitelisted for the service
    /// @param serviceId Service ID
    modifier onlyIfCallerIsWhitelisted(bytes32 serviceId) {
        require(
            clientIsWhitelisted(serviceId, msg.sender),
            "Caller not whitelisted"
        );
        _;
    }

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

    /// @notice Called to check if a client is whitelisted to use a service
    /// @param serviceId Service ID
    /// @param client Client address
    /// @return isWhitelisted If the user is whitelisted
    function clientIsWhitelisted(bytes32 serviceId, address client)
        public
        view
        override
        returns (bool isWhitelisted)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToClientToWhitelistStatus[
                serviceId
            ][client];
        return
            whitelistStatus.whitelistPastExpiration ||
            whitelistStatus.expirationTimestamp > block.timestamp;
    }
}
