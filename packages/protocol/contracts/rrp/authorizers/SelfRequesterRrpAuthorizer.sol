// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/RankedAdminnable.sol";
import "./RequesterRrpAuthorizer.sol";
import "./interfaces/ISelfRequesterRrpAuthorizer.sol";
import "../interfaces/IAirnodeRrp.sol";

/// @title Authorizer contract that whitelists requesters where each Airnode is
/// adminned by themselves
contract SelfRequesterRrpAuthorizer is
    RankedAdminnable,
    RequesterRrpAuthorizer,
    ISelfRequesterRrpAuthorizer
{
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }

    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 1;

    uint256 private constant MAX_RANK = type(uint256).max;

    /// @notice Called by an admin to extend the whitelist expiration of a user
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the user will no longer
    /// be whitelisted
    function extendWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    )
        external
        override
        onlyWithRank(deriveAdminnedId(airnode), uint256(AdminRank.Admin))
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
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelisting expiration of a
    /// user
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten expiration
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the whitelisting of the
    /// user will expire
    function setWhitelistExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        uint64 expirationTimestamp
    )
        external
        override
        onlyWithRank(deriveAdminnedId(airnode), uint256(AdminRank.SuperAdmin))
    {
        serviceIdToUserToWhitelistStatus[deriveServiceId(airnode, endpointId)][
            user
        ].expirationTimestamp = expirationTimestamp;
        emit SetWhitelistExpiration(
            airnode,
            endpointId,
            user,
            expirationTimestamp,
            msg.sender
        );
    }

    /// @notice Called by a super admin to set the whitelist status of a user
    /// past expiration
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param user User address
    /// @param status Whitelist status that the user will have past expiration
    function setWhitelistStatusPastExpiration(
        address airnode,
        bytes32 endpointId,
        address user,
        bool status
    )
        external
        override
        onlyWithRank(deriveAdminnedId(airnode), uint256(AdminRank.SuperAdmin))
    {
        serviceIdToUserToWhitelistStatus[deriveServiceId(airnode, endpointId)][
            user
        ].whitelistedPastExpiration = status;
        emit SetWhitelistStatusPastExpiration(
            airnode,
            endpointId,
            user,
            status,
            msg.sender
        );
    }

    /// @notice Called to get the rank of an admin for the entity
    /// @dev Respects RankedAdminnable, except treats the Airnode operator as
    /// the highest authority for the respective Airnode
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank for the entity
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override(RankedAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        // Airnodes are identified by addresses. Since RankedAdminnable
        // identifies entities with `bytes32` types, we convert the Airnode
        /// address to a `bytes32` type by padding with zeros.
        // See RequesterRrpAuthorizer.sol for more information
        if (adminnedId == deriveAdminnedId(admin)) return MAX_RANK;
        return RankedAdminnable.getRank(adminnedId, admin);
    }

    function deriveAdminnedId(address airnode)
        internal
        pure
        returns (bytes32 adminnedId)
    {
        return bytes32(abi.encode(airnode));
    }
}
