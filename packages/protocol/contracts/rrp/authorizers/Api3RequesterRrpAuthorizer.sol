// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/MetaAdminnable.sol";
import "./RequesterRrpAuthorizer.sol";
import "./interfaces/IApi3RequesterRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists requesters where the API3 DAO is
/// the meta-admin
/// @dev Unlike the MetaAdminnable contract that it inherits, this contract
/// does not support the independent adminning of different entities. In other
/// words, when an address is assigned to be an Admin/SuperAdmin, it becomes
/// the Admin/SuperAdmin of all entities being adminned. To achieve this, the
/// interface that allows the caller to specify an `adminnedId` is disabled,
/// and an alternative one is implemented where `adminnedId` is forced to be
/// `bytes32(0)`.
contract Api3RequesterRrpAuthorizer is
    MetaAdminnable,
    RequesterRrpAuthorizer,
    IApi3RequesterRrpAuthorizer
{
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }

    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 2;

    /// @param metaAdmin_ API3 meta-admin, i.e., the API3 DAO
    constructor(address metaAdmin_) MetaAdminnable(metaAdmin_) {}

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank for the entity
    /// @dev Overriden to disable
    /// @param adminnedId ID of the entity being adminned
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(
        bytes32 adminnedId, // solhint-disable-line no-unused-vars
        address targetAdmin, // solhint-disable-line no-unused-vars
        uint256 newRank // solhint-disable-line no-unused-vars
    ) public pure override(RankedAdminnable, IRankedAdminnable) {
        revert("Disabled interface");
    }

    /// @notice Called by an admin of higher rank to set the rank of an admin
    /// of lower rank for all entities
    /// @dev Overriden to force `bytes32(0)` as `adminnedId`
    /// @param targetAdmin Target admin address
    /// @param newRank Rank to be set
    function setRank(address targetAdmin, uint256 newRank) external override {
        RankedAdminnable.setRank(bytes32(0), targetAdmin, newRank);
    }

    /// @notice Called by an admin to decrease its rank for the entity
    /// @dev Overriden to disable
    /// @param adminnedId ID of the entity being adminned
    /// @param newRank Rank to be set
    function decreaseSelfRank(
        bytes32 adminnedId, // solhint-disable-line no-unused-vars
        uint256 newRank // solhint-disable-line no-unused-vars
    ) public pure override(RankedAdminnable, IRankedAdminnable) {
        revert("Disabled interface");
    }

    /// @notice Called by an admin to decrease its rank for all entities
    /// @dev Overriden to force `bytes32(0)` as `adminnedId`
    /// @param newRank Rank to be set
    function decreaseSelfRank(uint256 newRank) external override {
        RankedAdminnable.decreaseSelfRank(bytes32(0), newRank);
    }

    /// @notice Called by an admin to extend the whitelist expiration of a user
    /// for the Airnode–endpoint pair
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
        onlyWithRank(bytes32(0), uint256(AdminRank.Admin))
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
    /// user for the Airnode–endpoint pair
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
        onlyWithRank(bytes32(0), uint256(AdminRank.SuperAdmin))
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
    /// past expiration for the Airnode–endpoint pair
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
        onlyWithRank(bytes32(0), uint256(AdminRank.SuperAdmin))
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
    /// @dev We cannot disable this method because it is used internally.
    /// Instead, we require `adminnedId` to be `bytes32(0)`. External callers
    /// are recommended to use `getRank(address)` instead.
    /// @param adminnedId ID of the entity being adminned
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(bytes32 adminnedId, address admin)
        public
        view
        override(MetaAdminnable, IRankedAdminnable)
        returns (uint256)
    {
        require(adminnedId == bytes32(0), "adminnedId not zero");
        return MetaAdminnable.getRank(adminnedId, admin);
    }

    /// @notice Called to get the rank of an admin for all entities
    /// @param admin Admin address whose rank will be returned
    /// @return Admin rank
    function getRank(address admin) external view override returns (uint256) {
        return MetaAdminnable.getRank(bytes32(0), admin);
    }
}
