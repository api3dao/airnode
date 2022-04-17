// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./RoleDeriver.sol";
import "./interfaces/IAccessControlRegistry.sol";

/// @title Contract that allows users to manage independent, tree-shaped access
/// control tables
/// @notice Multiple contracts can refer to this contract to check if their
/// users have granted accounts specific roles. Therefore, it aims to keep all
/// access control roles of its users in this single contract.
/// @dev Each user is called a "manager", and is the only member of their root
/// role. Starting from this root role, they can create an arbitrary tree of
/// roles and grant these to accounts. Each role has a description, and roles
/// adminned by the same role cannot have the same description.
contract AccessControlRegistry is
    Multicall,
    AccessControl,
    RoleDeriver,
    IAccessControlRegistry
{
    /// @notice Initializes the manager by initializing its root role and
    /// granting it to them
    /// @dev Anyone can initialize a manager. An uninitialized manager
    /// attempting to initialize a role will be initialized automatically.
    /// Once a manager is initialized, subsequent initializations have no
    /// effect.
    /// @param manager Manager address to be initialized
    function initializeManager(address manager) public override {
        require(manager != address(0), "Manager address zero");
        bytes32 rootRole = deriveRootRole(manager);
        if (!hasRole(rootRole, manager)) {
            _grantRole(rootRole, manager);
            emit InitializedManager(rootRole, manager);
        }
    }

    /// @notice Called by the account to renounce the role
    /// @dev Overriden to disallow managers to renounce their root roles.
    /// `role` and `account` are not validated because
    /// `AccessControl.renounceRole` will revert if either of them is zero.
    /// @param role Role to be renounced
    /// @param account Account to renounce the role
    function renounceRole(bytes32 role, address account)
        public
        override(AccessControl, IAccessControl)
    {
        require(
            role != deriveRootRole(account),
            "role is root role of account"
        );
        AccessControl.renounceRole(role, account);
    }

    /// @notice Initializes a role by setting its admin role and grants it to
    /// the sender
    /// @dev If the sender should not have the initialized role, they should
    /// explicitly renounce it after initializing it.
    /// Once a role is initialized, subsequent initializations have no effect
    /// other than granting the role to the sender.
    /// The sender must be a member of `adminRole`. `adminRole` value is not
    /// validated because the sender cannot have the `bytes32(0)` role.
    /// If the sender is an uninitialized manager that is initializing a role
    /// directly under their root role, manager initialization will happen
    /// automatically, which will grant the sender `adminRole` and allow them
    /// to initialize the role.
    /// @param adminRole Admin role to be assigned to the initialized role
    /// @param description Human-readable description of the initialized role
    /// @return role Initialized role
    function initializeRoleAndGrantToSender(
        bytes32 adminRole,
        string calldata description
    ) external override returns (bytes32 role) {
        require(bytes(description).length > 0, "Role description empty");
        role = deriveRole(adminRole, description);
        // AccessControl roles have `DEFAULT_ADMIN_ROLE` (i.e., `bytes32(0)`)
        // as their `adminRole` by default. No account in AccessControlRegistry
        // can possibly have that role, which means all initialized roles will
        // have non-default admin roles, and vice versa.
        if (getRoleAdmin(role) == DEFAULT_ADMIN_ROLE) {
            if (adminRole == deriveRootRole(_msgSender())) {
                initializeManager(_msgSender());
            }
            _setRoleAdmin(role, adminRole);
            emit InitializedRole(role, adminRole, description, _msgSender());
        }
        grantRole(role, _msgSender());
    }

    /// @notice Derives the root role of the manager
    /// @param manager Manager address
    /// @return rootRole Root role
    function deriveRootRole(address manager)
        public
        pure
        override
        returns (bytes32 rootRole)
    {
        rootRole = _deriveRootRole(manager);
    }

    /// @notice Derives the role using its admin role and description
    /// @dev This implies that roles adminned by the same role cannot have the
    /// same description
    /// @param adminRole Admin role
    /// @param description Human-readable description of the role
    /// @return role Role
    function deriveRole(bytes32 adminRole, string calldata description)
        public
        pure
        override
        returns (bytes32 role)
    {
        role = _deriveRole(adminRole, description);
    }
}
