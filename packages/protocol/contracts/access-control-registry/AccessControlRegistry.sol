// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./interfaces/IAccessControlRegistry.sol";

// This is a registry for multiple users to manage their own access control
// tables independently. These users are named "tree owners" and are
// identified by their addresses. (I didn't use "owner" to avoid confusion
// with Ownable.sol)
//
// The access control tables implemented by this contract are tree-shaped,
// meaning that they consist of a root node and non-cyclical nodes branching
// down. Each node in this tree is a role from AccessControl.sol, and lower
// level nodes are the admins of the higher level nodes (where the root is level 0).
//
// The root node of the tree of a owner (i.e., that tree owner's highest ranking
// role) is derived using `treeOwnerToRootRole(address treeOwner)`. Only the
// tree owner is allowed to admin it.
//
// Initializing a role means appending a node to one of the nodes of the tree
// A member of a role can initialize a role whose admin role is the role that they have.
//
// Tree owners have all of the roles in their tree. This means they can grant or revoke
// all roles, and initialize roles under any role in their tree.
contract AccessControlRegistry is
    AccessControlEnumerable,
    IAccessControlRegistry
{
    // To keep track of which role belongs to which tree owner
    mapping(bytes32 => address) public override roleToTreeOwner;
    // A nonce to generate hashes
    uint256 private roleCountPlusOne = 1;
    // Would be nice if people used this
    mapping(bytes32 => string) public override roleToDescription;

    // Prevents the tree owner from being targeted as `account` for its roles
    modifier onlyNonTreeOwnerAccount(bytes32 role, address account) {
        require(
            role != treeOwnerToRootRole(account) && // Is this a root role of the tree
                roleToTreeOwner[role] != account, // Is this a non-root role of the tree
            "Account is tree owner"
        );
        _;
    }

    // Override function to give tree owners all roles under them
    function hasRole(bytes32 role, address account)
        public
        view
        override
        returns (bool)
    {
        return
            AccessControl.hasRole(role, account) || // The account actually has the role
            role == treeOwnerToRootRole(_msgSender()) || // Caller is the tree owner and `role` is its root role
            roleToTreeOwner[role] == _msgSender(); // Caller is the tree owner and `role` is one of its non-root roles
    }

    // Override function to disallow roles under it being granted to the tree owner
    function grantRole(bytes32 role, address account)
        public
        virtual
        override(AccessControlEnumerable, IAccessControl)
        onlyNonTreeOwnerAccount(role, account)
    {
        AccessControlEnumerable.grantRole(role, account);
    }

    // Override function to disallow roles under it being revoked from the tree owner
    function revokeRole(bytes32 role, address account)
        public
        virtual
        override(AccessControlEnumerable, IAccessControl)
        onlyNonTreeOwnerAccount(role, account)
    {
        AccessControlEnumerable.revokeRole(role, account);
    }

    // Override function to disallow roles under it being renounced by the tree owner
    function renounceRole(bytes32 role, address account)
        public
        virtual
        override(AccessControlEnumerable, IAccessControl)
        onlyNonTreeOwnerAccount(role, account)
    {
        AccessControlEnumerable.renounceRole(role, account);
    }

    function initializeRole(
        address treeOwner,
        bytes32 adminRole,
        string calldata description
    ) public override onlyRole(adminRole) returns (bytes32 role) {
        require(
            adminRole == treeOwnerToRootRole(treeOwner) || // Admin role is the root role
                roleToTreeOwner[adminRole] == treeOwner, // or a non-root role
            "adminRole does not belong to treeOwner"
        );

        // We don't let the user choose their own `role` because they can choose any
        // `treeOwnerToRootRole(treeOwner)` as the role that they want to admin
        role = keccak256(abi.encodePacked(address(this), roleCountPlusOne++));
        roleToTreeOwner[role] = treeOwner;
        roleToDescription[role] = description;

        _setRoleAdmin(role, adminRole);
    }

    function initializeAndGrantRole(
        address treeOwner,
        bytes32 adminRole,
        string calldata description,
        address account
    ) external override returns (bytes32 role) {
        require(account != address(0), "Account address zero");
        role = initializeRole(treeOwner, adminRole, description);
        grantRole(role, account);
    }

    // Prefer zero-padding over hashing for human-readability
    function treeOwnerToRootRole(address treeOwner)
        public
        pure
        override
        returns (bytes32 rootRole)
    {
        rootRole = bytes32(abi.encodePacked(treeOwner));
    }
}
