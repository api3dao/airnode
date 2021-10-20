// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./interfaces/IAccessControlRegistry.sol";

// This is a registry for multiple users to manage independent access control tables.
// These users are called managers and are identified by their addresses.
//
// The access control tables implemented by this contract are tree-shaped,
// meaning that they consist of a root node and non-cyclical nodes branching
// down. Each node in this tree is a role from AccessControl.sol. Each node
// is the admin of the node with one level higher (where the root is level 0).
//
// The root node of the tree of a manager (i.e., that manager's highest ranking
// role) is derived using `managerToRootRole(manager)`. Only the manager is
// allowed to admin it.
//
// Initializing a role means appending a node to one of the nodes of the tree.
// A member of a role can initialize a role whose admin role is the role that they have
// (i.e., they can append a new node under the node that they belong to).
//
// Managers have all of the roles in their tree. This means they can grant or revoke
// all roles, and initialize roles under any role in their tree.
contract AccessControlRegistry is
    AccessControlEnumerable,
    IAccessControlRegistry
{
    // To keep track of which role belongs to which manager
    mapping(bytes32 => address) public override roleToManager;
    // To keep track of all roles that belong to a manager (excluding the root role)
    mapping(address => bytes32[]) public override managerToRoles;
    // Roles of a specific manager have to be described with different strings
    // because role IDs are derived from these
    mapping(bytes32 => string) public override roleToDescription;

    // Prevents the manager from being targeted as `account` for its roles
    modifier onlyNonManagerAccount(bytes32 role, address account) {
        require(
            role != managerToRootRole(account) && // This shouldn't be the root role of the tree
                roleToManager[role] != account, // This shouldn't be a non-root role of the tree
            "Account is manager"
        );
        _;
    }

    function initializeAndGrantRole(
        address manager,
        bytes32 adminRole,
        string calldata description,
        address account
    ) external override returns (bytes32 role) {
        require(account != address(0), "Account address zero");
        role = initializeRole(manager, adminRole, description);
        grantRole(role, account);
    }

    function managerToRoleCount(address manager)
        external
        view
        override
        returns (uint256 roleCount)
    {
        roleCount = managerToRoles[manager].length;
    }

    // Override function to disallow roles under it being granted to the manager
    function grantRole(bytes32 role, address account)
        public
        override(AccessControlEnumerable, IAccessControl)
        onlyNonManagerAccount(role, account)
    {
        AccessControlEnumerable.grantRole(role, account);
    }

    // Override function to disallow roles under it being revoked from the manager
    function revokeRole(bytes32 role, address account)
        public
        override(AccessControlEnumerable, IAccessControl)
        onlyNonManagerAccount(role, account)
    {
        AccessControlEnumerable.revokeRole(role, account);
    }

    // Override function to disallow roles under it being renounced by the manager
    function renounceRole(bytes32 role, address account)
        public
        override(AccessControlEnumerable, IAccessControl)
        onlyNonManagerAccount(role, account)
    {
        AccessControlEnumerable.renounceRole(role, account);
    }

    function initializeRole(
        address manager,
        bytes32 adminRole,
        string calldata description
    ) public override onlyRole(adminRole) returns (bytes32 role) {
        require(
            adminRole == managerToRootRole(manager) || // Admin role should be the root role...
                roleToManager[adminRole] == manager, // or a non-root role of the manager
            "manager-adminRole mismatch"
        );

        role = keccak256(abi.encodePacked(manager, description));
        require(
            getRoleAdmin(role) == DEFAULT_ADMIN_ROLE,
            "Role already initialized"
        );
        roleToManager[role] = manager;
        roleToDescription[role] = description;
        managerToRoles[manager].push(role);

        _setRoleAdmin(role, adminRole);
    }

    // Override function to give manager all roles under them
    function hasRole(bytes32 role, address account)
        public
        view
        override
        returns (bool)
    {
        return
            AccessControl.hasRole(role, account) || // The account actually has the role
            role == managerToRootRole(_msgSender()) || // Caller is the manager and `role` is its root role
            roleToManager[role] == _msgSender(); // Caller is the manager and `role` is one of its non-root roles
    }

    // Prefer zero-padding over hashing for human-readability
    function managerToRootRole(address manager)
        public
        pure
        override
        returns (bytes32 rootRole)
    {
        rootRole = bytes32(abi.encodePacked(manager));
    }
}
