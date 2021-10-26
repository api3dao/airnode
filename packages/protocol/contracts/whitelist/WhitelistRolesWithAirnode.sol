// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./WhitelistRoles.sol";
import "./interfaces/IWhitelistRolesWithAirnode.sol";

/// @title Contract that implements a whitelist controlled by
/// AccessControlRegistry roles set by individual Airnodes
contract WhitelistRolesWithAirnode is
    WhitelistRoles,
    IWhitelistRolesWithAirnode
{
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
