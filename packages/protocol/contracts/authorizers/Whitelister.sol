// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RankedAdminnable.sol";
import "./interfaces/IWhitelister.sol";

/// @title Contract where users are whitelisted until an expiration time or
/// indefinitely (until the whitelisting is revoked)
contract Whitelister is RankedAdminnable, IWhitelister {
    /// @notice Keeps the whitelisting statuses of users for individual
    /// services (could be Airnodes, dAPIs, beacons, etc.)
    mapping(bytes32 => mapping(address => WhitelistStatus))
        public
        override serviceIdToUserToWhitelistStatus;

    /// @dev Reverts if the caller is not whitelisted for the service
    /// @param serviceId Service ID
    modifier onlyIfCallerIsWhitelisted(bytes32 serviceId) {
        require(
            userIsWhitelisted(serviceId, msg.sender),
            "Caller not whitelisted"
        );
        _;
    }

    /// @notice Called by an admin to extend the whitelist expiration of a user
    /// @param serviceId Service ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the user will no longer
    /// be whitelisted
    function extendWhitelistExpiration(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) external override onlyWithRank(serviceId, uint256(AdminRank.Admin)) {
        require(
            expirationTimestamp >
                serviceIdToUserToWhitelistStatus[serviceId][user]
                    .expirationTimestamp,
            "Expiration not extended"
        );
        serviceIdToUserToWhitelistStatus[serviceId][user]
            .expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            serviceId,
            user,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelisting expiration of a
    /// user
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten the expiration
    /// @param serviceId Service ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    function setWhitelistExpiration(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) external override onlyWithRank(serviceId, uint256(AdminRank.SuperAdmin)) {
        serviceIdToUserToWhitelistStatus[serviceId][user]
            .expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            serviceId,
            user,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a user
    /// past expiration
    /// @param serviceId Service ID
    /// @param user User address
    /// @param status Whitelist status that the user will have past expiration
    function setWhitelistStatusPastExpiration(
        bytes32 serviceId,
        address user,
        bool status
    ) external override onlyWithRank(serviceId, uint256(AdminRank.SuperAdmin)) {
        serviceIdToUserToWhitelistStatus[serviceId][user]
            .whitelistedPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            serviceId,
            user,
            status,
            msg.sender
        );
    }

    /// @notice Called to check if a user is whitelisted to use a service
    /// @param serviceId Service ID
    /// @param user User address
    /// @return isWhitelisted If the user is whitelisted
    function userIsWhitelisted(bytes32 serviceId, address user)
        public
        view
        override
        returns (bool isWhitelisted)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                serviceId
            ][user];
        return
            whitelistStatus.whitelistedPastExpiration ||
            whitelistStatus.expirationTimestamp > block.timestamp;
    }
}
