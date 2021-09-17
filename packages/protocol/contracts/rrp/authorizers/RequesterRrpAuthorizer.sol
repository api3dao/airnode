// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/Whitelister.sol";
import "./interfaces/IRequesterRrpAuthorizer.sol";

/// @title Authorizer contract where requesters are whitelisted until an
/// expiration time or indefinitely
abstract contract RequesterRrpAuthorizer is
    Whitelister,
    IRequesterRrpAuthorizer
{
    /// @notice Called to check if a user is whitelisted to use the
    /// Airnode–endpoint pair
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @return isWhitelisted If the user is whitelisted
    function userIsWhitelisted(
        address airnode,
        bytes32 endpointId,
        address user
    ) external view override returns (bool isWhitelisted) {
        return userIsWhitelisted(deriveServiceId(airnode, endpointId), user);
    }

    /// @notice Called to get the detailed whitelist status of a user for the
    /// Airnode–endpoint pair
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @return expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    /// @return whitelistedPastExpiration Whitelist status that the user will
    /// have past expiration
    function airnodeToEndpointIdToUserToWhitelistStatus(
        address airnode,
        bytes32 endpointId,
        address user
    )
        external
        view
        override
        returns (uint64 expirationTimestamp, bool whitelistedPastExpiration)
    {
        WhitelistStatus
            storage whitelistStatus = serviceIdToUserToWhitelistStatus[
                deriveServiceId(airnode, endpointId)
            ][user];
        expirationTimestamp = whitelistStatus.expirationTimestamp;
        whitelistedPastExpiration = whitelistStatus.whitelistedPastExpiration;
    }

    /// @notice Called internally to derive the service ID of the
    /// Airnode–endpoint pair
    /// @dev Whitelister contract that this contract inherits keeps whitelist
    /// statuses in a single level hash map. We have two parameters here
    /// (Airnode address and endpoint ID) from which we need to derive a single
    /// service ID, and we do this by calculating their hash.
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @return serviceId Service ID
    function deriveServiceId(address airnode, bytes32 endpointId)
        internal
        pure
        returns (bytes32 serviceId)
    {
        return keccak256(abi.encodePacked(airnode, endpointId));
    }

    /// @notice Called internally to extend the whitelist expiration of a user
    /// for the Airnode–endpoint pair
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the user will no longer
    /// be whitelisted
    function extendWhitelistExpiration_(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    )
        internal
        onlyIfTimestampExtends(
            deriveServiceId(airnode, endpointId),
            user,
            expirationTimestamp
        )
    {
        serviceIdToUserToWhitelistStatus[deriveServiceId(airnode, endpointId)][
            user
        ].expirationTimestamp = expirationTimestamp;
        emit ExtendedWhitelistExpiration(
            airnode,
            endpointId,
            user,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Called internally to set the whitelisting expiration of a
    /// user for the Airnode–endpoint pair
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten expiration
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    function setWhitelistExpiration_(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    ) internal {
        serviceIdToUserToWhitelistStatus[deriveServiceId(airnode, endpointId)][
            user
        ].expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            airnode,
            endpointId,
            user,
            msg.sender,
            expirationTimestamp
        );
    }

    /// @notice Called internally to set the whitelist status of a user
    /// past expiration for the Airnode–endpoint pair
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @param status Whitelist status that the user will have past expiration
    function setWhitelistStatusPastExpiration_(
        address airnode,
        bytes32 endpointId,
        address user,
        bool status
    ) internal {
        serviceIdToUserToWhitelistStatus[deriveServiceId(airnode, endpointId)][
            user
        ].whitelistedPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            airnode,
            endpointId,
            user,
            msg.sender,
            status
        );
    }
}
