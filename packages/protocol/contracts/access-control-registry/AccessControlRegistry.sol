// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./interfaces/IAccessControlRegistry.sol";

// This is a registry for multiple users to manage independent access control tables.
// These users are called managers and are identified by their addresses. Each
// manager has a root role that can be derived using `deriveRootRole(manager)`.
// Once initialized, the manager is the only member of this role.
//
// The access control tables implemented by this contract are tree-shaped,
// meaning that they consist of a root node and non-cyclical nodes branching
// down. Each node in this tree is a role from AccessControl.sol. Each node
// is the admin of the node with one level higher.
//
// The root node of the tree of a manager (i.e., that manager's highest ranking
// role) is derived using `deriveRootRole(manager)`. Its admin role is DEFAULT_ADMIN_ROLE,
// which has no members (meaning that it can't be adminned).
//
// Initializing a role means appending a node to one of the nodes of the tree.
// A member of a role can initialize a role whose admin role is the role that they have
// (i.e., they can append a new node under the node that they belong to).
//
// Managers cannot grant or revoke all roles in their tree, they are only the highest
// ranking admin. However, they can grant a role that grants itself all the roles needed,
// perform the grant/revoke actions required and self-destruct, effectively allowing the
// manager to perform these actions.
contract AccessControlRegistry is
    AccessControlEnumerable,
    IAccessControlRegistry
{
    // To keep track of which role belongs to which manager
    mapping(bytes32 => address) public override roleToManager;
    // To keep track of all roles that belong to a manager
    mapping(address => bytes32[]) public override managerToRoles;
    // Roles adminned by the same role have to be described with different strings
    // because their IDs are derived from the admin role and the description
    mapping(bytes32 => string) public override roleToDescription;

    // Anyone can initialize a manager
    // A manager can only be initialized once
    function initializeManager(address manager) external override {
        bytes32 rootRole = deriveRootRole(manager);
        require(!hasRole(rootRole, manager), "Manager already initialized");
        _setupRole(rootRole, manager);
        roleToManager[rootRole] = manager;
        managerToRoles[manager].push(rootRole);
        emit InitializedManager(manager, rootRole);
    }

    // Override function to disallow manager from renouncing its root role
    function renounceRole(bytes32 role, address account)
        public
        override(AccessControlEnumerable, IAccessControl)
    {
        // This will revert if account is the manager and its trying to
        // renounce its root role
        require(
            role != deriveRootRole(account),
            "role is root role of account"
        );
        AccessControlEnumerable.renounceRole(role, account);
    }

    // Only a member of adminRole can initialize a role
    function initializeRole(bytes32 adminRole, string calldata description)
        public
        override
        onlyRole(adminRole)
        returns (bytes32 role)
    {
        role = deriveRole(adminRole, description);
        require(
            getRoleAdmin(role) == DEFAULT_ADMIN_ROLE,
            "Role already initialized"
        );
        roleToDescription[role] = description;

        address manager = roleToManager[adminRole];
        roleToManager[role] = manager;
        managerToRoles[manager].push(role);

        _setRoleAdmin(role, adminRole);
        emit InitializedRole(role, adminRole, description, _msgSender());
    }

    // A convenience function because most users will initialize a role to grant it to one account
    function initializeAndGrantRole(
        bytes32 adminRole,
        string calldata description,
        address account
    ) external override returns (bytes32 role) {
        // Not checking if account is zero because neither does AccessControl
        role = initializeRole(adminRole, description);
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

    // This can be used instead of hasRole() to allow the manager do everything
    // that its roles can do (for example, SelfAuthorizer will use this to allow
    // the Airnode address to do everything itself).
    function hasRoleOrIsManagerOfRole(bytes32 role, address account)
        external
        view
        override
        returns (bool)
    {
        return hasRole(role, account) || roleToManager[role] == account;
    }

    // Prefer zero-padding over hashing for human-readability
    function deriveRootRole(address manager)
        public
        pure
        override
        returns (bytes32 rootRole)
    {
        rootRole = bytes32(abi.encode(manager));
    }

    function deriveRole(bytes32 adminRole, string calldata description)
        public
        pure
        override
        returns (bytes32 role)
    {
        role = keccak256(abi.encodePacked(adminRole, description));
    }
}
