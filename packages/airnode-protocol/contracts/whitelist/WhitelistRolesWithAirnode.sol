// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./WhitelistRoles.sol";
import "./interfaces/IWhitelistRolesWithAirnode.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Contract that implements AccessControlRegistry roles for a whitelist
/// contract where each individual Airnode address is its own manager
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
        external
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

    /// @dev Returns if the account has the whitelist expiration extender role
    /// or is the Airnode address
    /// @param airnode Airnode address
    /// @param account Account address
    /// @return If the account has the whitelist extender role or is the
    /// Airnode address
    function hasWhitelistExpirationExtenderRoleOrIsAirnode(
        address airnode,
        address account
    ) internal view returns (bool) {
        return
            airnode == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                deriveWhitelistExpirationExtenderRole(airnode),
                account
            );
    }

    /// @dev Returns if the account has the whitelist expriation setter role or
    /// is the Airnode address
    /// @param airnode Airnode address
    /// @param account Account address
    /// @return If the account has the whitelist setter role or is the Airnode
    /// address
    function hasWhitelistExpirationSetterRoleOrIsAirnode(
        address airnode,
        address account
    ) internal view returns (bool) {
        return
            airnode == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                deriveWhitelistExpirationSetterRole(airnode),
                account
            );
    }

    /// @dev Returns if the account has the indefinite whitelister role or is the
    /// Airnode address
    /// @param airnode Airnode address
    /// @param account Account address
    /// @return If the account has the indefinite whitelister role or is the
    /// Airnode addrss
    function hasIndefiniteWhitelisterRoleOrIsAirnode(
        address airnode,
        address account
    ) internal view returns (bool) {
        return
            airnode == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                deriveIndefiniteWhitelisterRole(airnode),
                account
            );
    }
}
