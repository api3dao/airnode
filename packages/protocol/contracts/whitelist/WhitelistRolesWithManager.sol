// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./WhitelistRoles.sol";
import "./interfaces/IWhitelistRolesWithManager.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";

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

    /// @dev Reverts if the caller does not have the whitelist expiration
    /// extender role and is not the manager address
    modifier onlyWhitelistExpirationExtenderOrManager() {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    whitelistExpirationExtenderRole,
                    msg.sender
                ),
            "Not expiration extender"
        );
        _;
    }

    /// @dev Reverts if the caller does not have the whitelist expiration
    /// setter role and is not the manager address
    modifier onlyWhitelistExpirationSetterOrManager() {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    whitelistExpirationSetterRole,
                    msg.sender
                ),
            "Not expiration setter"
        );
        _;
    }

    /// @dev Reverts if the caller does not have the indefinite whitelister
    /// role and is not the manager address
    modifier onlyIndefiniteWhitelisterOrManager() {
        require(
            manager == msg.sender ||
                IAccessControlRegistry(accessControlRegistry).hasRole(
                    indefiniteWhitelisterRole,
                    msg.sender
                ),
            "Not indefinite whitelister"
        );
        _;
    }

    /// @dev Reverts if the caller has the indefinite whitelister role or is
    /// the manager address
    /// @param setter Setter of the indefinite whitelist status
    modifier onlyIfSetterIsNotIndefiniteWhitelisterAndNotManager(
        address setter
    ) {
        require(
            manager != setter &&
                !IAccessControlRegistry(accessControlRegistry).hasRole(
                    indefiniteWhitelisterRole,
                    setter
                ),
            "setter is indefinite whitelister"
        );
        _;
    }

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
