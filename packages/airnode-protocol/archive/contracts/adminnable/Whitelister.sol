// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title Contract where users are whitelisted for specific services (could be
/// Airnode endpoints, dAPIs, beacons, etc.) until an expiration time or
/// indefinitely
contract Whitelister {
    struct WhitelistStatus {
        uint64 expirationTimestamp;
        bool whitelistedPastExpiration;
    }

    mapping(bytes32 => mapping(address => WhitelistStatus))
        internal serviceIdToUserToWhitelistStatus;

    /// @dev Reverts if the provided timestamp does not extend whitelist
    /// expiration for the service–user pair
    /// @param serviceId Service ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the user will no longer
    /// be whitelisted
    modifier onlyIfTimestampExtends(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) {
        require(
            expirationTimestamp >
                serviceIdToUserToWhitelistStatus[serviceId][user]
                    .expirationTimestamp,
            "Expiration not extended"
        );
        _;
    }

    /// @notice Called internally to check if a user is whitelisted to use the
    /// service
    /// @dev The user is whitelisted if the current timestamp is earlier than
    /// the expiration of the temporary whitelisting for the service–user pair
    /// or the service–user pair is whitelisted permanently. These two
    /// conditions function independently, and the pair is considered
    /// whitelisted even if only one of these apply.
    /// @param serviceId Service ID
    /// @param user User address
    /// @return isWhitelisted If the user is whitelisted
    function userIsWhitelisted(bytes32 serviceId, address user)
        internal
        view
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
