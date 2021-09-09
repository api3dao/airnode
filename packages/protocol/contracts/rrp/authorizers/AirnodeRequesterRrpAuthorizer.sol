// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../adminnable/SelfAdminnable.sol";
import "./RequesterRrpAuthorizer.sol";
import "./interfaces/IAirnodeRequesterRrpAuthorizer.sol";

/// @title Authorizer contract that whitelists requesters where each Airnode is
/// adminned by themselves
contract AirnodeRequesterRrpAuthorizer is
    SelfAdminnable,
    RequesterRrpAuthorizer,
    IAirnodeRequesterRrpAuthorizer
{
    enum AdminRank {
        Unauthorized,
        Admin,
        SuperAdmin
    }

    /// @notice Authorizer contracts use `AUTHORIZER_TYPE` to signal their type
    uint256 public constant override AUTHORIZER_TYPE = 1;

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
        onlyWithRank(airnode, uint256(AdminRank.Admin))
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
    ) external override onlyWithRank(airnode, uint256(AdminRank.SuperAdmin)) {
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
    ) external override onlyWithRank(airnode, uint256(AdminRank.SuperAdmin)) {
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

    /// @notice Verifies the authorization status of a request
    /// @dev This method has redundant arguments because all authorizer
    /// contracts have to have the same interface and potential authorizer
    /// contracts may require to access the arguments that are redundant here
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param endpointId Endpoint ID
    /// @param sponsor Sponsor address
    /// @param requester Requester address
    /// @return Authorization status of the request
    function isAuthorized(
        bytes32 requestId, // solhint-disable-line no-unused-vars
        address airnode,
        bytes32 endpointId,
        address sponsor, // solhint-disable-line no-unused-vars
        address requester
    ) external view override returns (bool) {
        return
            userIsWhitelisted(
                deriveServiceId(airnode, endpointId),
                requester
            ) ||
            adminnedToAdminToRank[airnode][requester] >=
            uint256(AdminRank.Admin) ||
            requester == airnode;
    }
}
