// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./WhitelistRoles.sol";
import "./interfaces/IWhitelistRolesWithManager.sol";

/// @title Contract that implements a whitelist controlled by
/// AccessControlRegistry roles set by a manager
contract WhitelistRolesWithManager is
    WhitelistRoles,
    IWhitelistRolesWithManager
{
    /// @notice Address of the manager that manages the related
    /// AccessControlRegistry roles
    address public immutable override manager;

    /// @notice Admin role
    bytes32 public immutable override adminRole;

    /// @notice Whitelist expiration extender role
    bytes32 public immutable override whitelistExpirationExtenderRole;

    /// @notice Whitelist expiration setter role
    bytes32 public immutable override whitelistExpirationSetterRole;

    /// @notice Indefinite whitelister role
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
}
