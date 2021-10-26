// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./WhitelistRoles.sol";
import "./interfaces/IWhitelistRolesWithAirnode.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Contract that implements a whitelist controlled by
/// AccessControlRegistry roles set by individual Airnodes
contract WhitelistRolesWithAirnode is
    WhitelistRoles,
    IWhitelistRolesWithAirnode
{
    /// @dev Reverts if the caller does not have the whitelist expiration
    /// extender role and is not the Airnode address
    /// @param airnode Airnode address
    modifier onlyWhitelistExpirationExtenderOrAirnode(address airnode) {
        require(
            airnode == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveWhitelistExpirationExtenderRole(airnode),
                    msg.sender
                ),
            "Not expiration extender"
        );
        _;
    }

    /// @dev Reverts if the caller does not have the whitelist expiration
    /// setter role and is not the Airnode address
    /// @param airnode Airnode address
    modifier onlyWhitelistExpirationSetterOrAirnode(address airnode) {
        require(
            airnode == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveWhitelistExpirationSetterRole(airnode),
                    msg.sender
                ),
            "Not expiration setter"
        );
        _;
    }

    /// @dev Reverts if the caller does not have the indefinite whitelister
    /// role and is not the Airnode address
    /// @param airnode Airnode address
    modifier onlyIndefiniteWhitelisterOrAirnode(address airnode) {
        require(
            airnode == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveIndefiniteWhitelisterRole(airnode),
                    msg.sender
                ),
            "Not indefinite whitelister"
        );
        _;
    }

    /// @dev Reverts if the caller has the indefinite whitelister role or is
    /// the Airnode address
    /// @param airnode Airnode address
    /// @param setter Setter of the indefinite whitelist status
    modifier onlyIfSetterIsNotIndefiniteWhitelisterAndNotAirnode(
        address airnode,
        address setter
    ) {
        require(
            airnode != setter &&
                !IAccessControlRegistry(accessControlRegistry).hasRole(
                    deriveIndefiniteWhitelisterRole(airnode),
                    setter
                ),
            "setter is indefinite whitelister"
        );
        _;
    }

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) WhitelistRoles(_accessControlRegistry, _adminRoleDescription) {}

    /// @notice Derives the admin role for the specific Airnode address
    /// @param airnode Airnode address
    /// @return adminRole Admin role
    function deriveAdminRole(address airnode)
        public
        view
        override
        returns (bytes32 adminRole)
    {
        adminRole = _deriveAdminRole(airnode);
    }

    /// @notice Derives the whitelist expiration extender role for the specific
    /// Airnode address
    /// @param airnode Airnode address
    /// @return whitelistExpirationExtenderRole Whitelist expiration extender
    /// role
    function deriveWhitelistExpirationExtenderRole(address airnode)
        public
        view
        override
        returns (bytes32 whitelistExpirationExtenderRole)
    {
        whitelistExpirationExtenderRole = _deriveWhitelistExpirationExtenderRole(
            airnode
        );
    }

    /// @notice Derives the whitelist expiration setter role for the specific
    /// Airnode address
    /// @param airnode Airnode address
    /// @return whitelistExpirationSetterRole Whitelist expiration setter role
    function deriveWhitelistExpirationSetterRole(address airnode)
        public
        view
        override
        returns (bytes32 whitelistExpirationSetterRole)
    {
        whitelistExpirationSetterRole = _deriveWhitelistExpirationSetterRole(
            airnode
        );
    }

    /// @notice Derives the indefinite whitelister role for the specific
    /// Airnode address
    /// @param airnode Airnode address
    /// @return indefiniteWhitelisterRole Indefinite whitelister role
    function deriveIndefiniteWhitelisterRole(address airnode)
        public
        view
        override
        returns (bytes32 indefiniteWhitelisterRole)
    {
        indefiniteWhitelisterRole = _deriveIndefiniteWhitelisterRole(airnode);
    }
}
