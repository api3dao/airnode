// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./WhitelistRoles.sol";
import "./interfaces/IWhitelistRolesWithManager.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";

/// @title Contract that implements AccessControlRegistry roles for a whitelist
/// contract controlled by a single manager account
contract WhitelistRolesWithManager is
    WhitelistRoles,
    IWhitelistRolesWithManager
{
    /// @notice Address of the manager that manages the related
    /// AccessControlRegistry roles
    address public immutable override manager;

    // Since there will be a single manager, we can derive the roles beforehand
    bytes32 public immutable override adminRole;
    bytes32 public immutable override whitelistExpirationExtenderRole;
    bytes32 public immutable override whitelistExpirationSetterRole;
    bytes32 public immutable override indefiniteWhitelisterRole;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    ) WhitelistRoles(_accessControlRegistry, _adminRoleDescription) {
        require(_manager != address(0), "Manager address zero");
        manager = _manager;
        adminRole = _deriveAdminRole(_manager);
        whitelistExpirationExtenderRole = _deriveWhitelistExpirationExtenderRole(
            _manager
        );
        whitelistExpirationSetterRole = _deriveWhitelistExpirationSetterRole(
            _manager
        );
        indefiniteWhitelisterRole = _deriveIndefiniteWhitelisterRole(_manager);
    }

    /// @dev Returns if the account has the whitelist expiration extender role
    /// or is the manager
    /// @param account Account address
    /// @return If the account has the whitelist extender role or is the
    /// manager
    function hasWhitelistExpirationExtenderRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                whitelistExpirationExtenderRole,
                account
            );
    }

    /// @dev Returns if the account has the whitelist expriation setter role or
    /// is the manager
    /// @param account Account address
    /// @return If the account has the whitelist setter role or is the
    /// manager
    function hasWhitelistExpirationSetterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                whitelistExpirationSetterRole,
                account
            );
    }

    /// @dev Returns if the account has the indefinite whitelister role or is the
    /// manager
    /// @param account Account address
    /// @return If the account has the indefinite whitelister role or is the
    /// manager
    function hasIndefiniteWhitelisterRoleOrIsManager(address account)
        internal
        view
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                indefiniteWhitelisterRole,
                account
            );
    }
}
