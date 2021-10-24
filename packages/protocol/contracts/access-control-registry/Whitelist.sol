// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RoleDeriver.sol";
import "./interfaces/IWhitelist.sol";

/// @title Contract that implements a generic whitelist
/// @notice This contract can be inherited and extended to implement temporary
/// and permanent whitelists managed by AccessControlRegistry roles
/// @dev This contract implements two kinds of whitelisting:
///   (1) Temporary, ends when the expiration timestamp is in the past
///   (2) Indefinite, ends when the indefinite whitelist count is zero
/// Multiple senders can grant and revoke indefinite whitelists
/// independently. The requester will be considered whitelisted as long as
/// there is at least one active indefinite whitelist.
/// Indefinite whitelists can be revoked if the sender that set them no
/// longer has the indefinite whitelister role.
contract Whitelist is RoleDeriver, IWhitelist {
    struct WhitelistStatus {
        uint64 expirationTimestamp;
        uint192 indefiniteWhitelistCount;
    }

    // There are four roles in this contract:
    // Root
    // └── (1) Admin (can grant and revoke the roles below)
    //     ├── (2) Whitelist expiration extender
    //     ├── (3) Whitelist expiration setter
    //     └── (4) Indefinite whitelister
    // Their IDs are derived from the descriptions below. Refer to
    // AccessControlRegistry for more information.
    string public override adminRoleDescription;
    string
        public constant
        override WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION =
        "Whitelist expiration extender";
    string
        public constant
        override WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION =
        "Whitelist expiration setter";
    string public constant override INDEFINITE_WHITELISTER_ROLE_DESCRIPTION =
        "Indefinite whitelister";
    bytes32 internal adminRoleDescriptionHash;
    bytes32
        internal constant WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION)
        );
    bytes32
        internal constant WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(
            abi.encodePacked(WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION)
        );
    bytes32 internal constant INDEFINITE_WHITELISTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(INDEFINITE_WHITELISTER_ROLE_DESCRIPTION));

    /// @notice Address of the AccessControlRegistry contract that keeps the
    /// roles
    address public immutable override accessControlRegistry;

    /// @notice Whitelist status of a service for a user
    mapping(bytes32 => mapping(address => WhitelistStatus))
        internal serviceIdToUserToWhitelistStatus;

    /// @notice If an address has set the indefinite whitelist status of a user
    /// for a service
    mapping(bytes32 => mapping(address => mapping(address => bool)))
        internal serviceIdToUserToSetterToIndefiniteWhitelistStatus;

    /// @param _accessControlRegistry AccessControlRegistry address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) {
        require(_accessControlRegistry != address(0), "ACR address zero");
        require(
            bytes(_adminRoleDescription).length > 0,
            "Admin role description empty"
        );
        accessControlRegistry = _accessControlRegistry;
        adminRoleDescription = _adminRoleDescription;
        adminRoleDescriptionHash = keccak256(
            abi.encodePacked(_adminRoleDescription)
        );
    }

    /// @notice Extends the expiration of the temporary whitelist of
    /// the user for the service
    /// @param serviceId Service ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function _extendWhitelistExpiration(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) internal {
        require(
            expirationTimestamp >
                serviceIdToUserToWhitelistStatus[serviceId][user]
                    .expirationTimestamp,
            "Does not extend expiration"
        );
        serviceIdToUserToWhitelistStatus[serviceId][user]
            .expirationTimestamp = expirationTimestamp;
    }

    /// @notice Sets the expiration of the temporary whitelist of the user for
    /// the service
    /// @dev Unlike `extendWhitelistExpiration()`, this can hasten expiration
    /// @param serviceId Service ID
    /// @param user User address
    /// @param expirationTimestamp Timestamp at which the temporary whitelist
    /// will expire
    function _setWhitelistExpiration(
        bytes32 serviceId,
        address user,
        uint64 expirationTimestamp
    ) internal {
        serviceIdToUserToWhitelistStatus[serviceId][user]
            .expirationTimestamp = expirationTimestamp;
    }

    /// @notice Sets the indefinite whitelist status of the user for the
    /// service
    /// @dev As long as at least there is at least one account that has set the
    /// indefinite whitelist status of the user for the service as true, the
    /// user will be considered whitelisted.
    /// @param serviceId Service ID
    /// @param user User address
    /// @param status Indefinite whitelist status
    function _setIndefiniteWhitelistStatus(
        bytes32 serviceId,
        address user,
        bool status
    ) internal returns (uint192 indefiniteWhitelistCount) {
        indefiniteWhitelistCount = serviceIdToUserToWhitelistStatus[serviceId][
            user
        ].indefiniteWhitelistCount;
        if (
            status &&
            !serviceIdToUserToSetterToIndefiniteWhitelistStatus[serviceId][
                user
            ][msg.sender]
        ) {
            serviceIdToUserToSetterToIndefiniteWhitelistStatus[serviceId][user][
                msg.sender
            ] = true;
            indefiniteWhitelistCount++;
            serviceIdToUserToWhitelistStatus[serviceId][user]
                .indefiniteWhitelistCount = indefiniteWhitelistCount;
        } else if (
            !status &&
            serviceIdToUserToSetterToIndefiniteWhitelistStatus[serviceId][user][
                msg.sender
            ]
        ) {
            serviceIdToUserToSetterToIndefiniteWhitelistStatus[serviceId][user][
                msg.sender
            ] = false;
            indefiniteWhitelistCount--;
            serviceIdToUserToWhitelistStatus[serviceId][user]
                .indefiniteWhitelistCount = indefiniteWhitelistCount;
        }
    }

    /// @notice Revokes the indefinite whitelist status granted to the user for
    /// the service by a specific account
    /// @param serviceId Service ID
    /// @param user User address
    /// @param setter Setter of the indefinite whitelist status
    function _revokeIndefiniteWhitelistStatus(
        bytes32 serviceId,
        address user,
        address setter
    ) internal returns (bool revoked, uint192 indefiniteWhitelistCount) {
        indefiniteWhitelistCount = serviceIdToUserToWhitelistStatus[serviceId][
            user
        ].indefiniteWhitelistCount;
        if (
            serviceIdToUserToSetterToIndefiniteWhitelistStatus[serviceId][user][
                setter
            ]
        ) {
            serviceIdToUserToSetterToIndefiniteWhitelistStatus[serviceId][user][
                setter
            ] = false;
            indefiniteWhitelistCount--;
            serviceIdToUserToWhitelistStatus[serviceId][user]
                .indefiniteWhitelistCount = indefiniteWhitelistCount;
            revoked = true;
        }
    }

    /// @notice Returns if the user is whitelised to use the service
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
            whitelistStatus.indefiniteWhitelistCount > 0 ||
            whitelistStatus.expirationTimestamp > block.timestamp;
    }

    /// @notice Derives the admin role for the specific manager address
    /// @param manager Manager address
    /// @return adminRole Admin role
    function _deriveAdminRole(address manager)
        internal
        view
        returns (bytes32 adminRole)
    {
        adminRole = _deriveRole(
            _deriveRootRole(manager),
            adminRoleDescriptionHash
        );
    }

    /// @notice Derives the whitelist expiration extender role for the specific
    /// manager address
    /// @param manager Manager address
    /// @return whitelistExpirationExtenderRole Whitelist expiration extender
    /// role
    function _deriveWhitelistExpirationExtenderRole(address manager)
        internal
        view
        returns (bytes32 whitelistExpirationExtenderRole)
    {
        whitelistExpirationExtenderRole = _deriveRole(
            _deriveAdminRole(manager),
            WHITELIST_EXPIRATION_EXTENDER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the whitelist expiration setter role for the specific
    /// manager address
    /// @param manager Manager address
    /// @return whitelistExpirationSetterRole Whitelist expiration setter role
    function _deriveWhitelistExpirationSetterRole(address manager)
        internal
        view
        returns (bytes32 whitelistExpirationSetterRole)
    {
        whitelistExpirationSetterRole = _deriveRole(
            _deriveAdminRole(manager),
            WHITELIST_EXPIRATION_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Derives the indefinite whitelister role for the specific
    /// manager address
    /// @param manager Manager address
    /// @return indefiniteWhitelisterRole Indefinite whitelister role
    function _deriveIndefiniteWhitelisterRole(address manager)
        internal
        view
        returns (bytes32 indefiniteWhitelisterRole)
    {
        indefiniteWhitelisterRole = _deriveRole(
            _deriveAdminRole(manager),
            INDEFINITE_WHITELISTER_ROLE_DESCRIPTION_HASH
        );
    }
}
