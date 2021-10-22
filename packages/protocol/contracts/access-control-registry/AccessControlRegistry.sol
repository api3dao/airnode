// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
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
// (i.e., they can append a new node under the node that they belong to). The initalized
// role is granted to the sender.
//
// Managers cannot inherently grant or revoke all roles in their tree, they are only the highest
// ranking admin. However, they can grant a role that grants itself all the roles needed,
// perform the grant/revoke actions required and self-destruct, effectively allowing the
// manager to perform these actions.
contract AccessControlRegistry is AccessControl, IAccessControlRegistry {
    // To keep track of which role belongs to which manager
    mapping(bytes32 => address) public override roleToManager;

    // Anyone can initialize a manager
    // Subsequent initializations don't do anything
    function initializeManager(address manager) public override {
        bytes32 rootRole = deriveRootRole(manager);
        if (!hasRole(rootRole, manager)) {
            _setupRole(rootRole, manager);
            roleToManager[rootRole] = manager;
            emit InitializedManager(manager, rootRole);
        }
    }

    // Override function to disallow manager from renouncing its root role
    function renounceRole(bytes32 role, address account)
        public
        override(AccessControl, IAccessControl)
    {
        // This will revert if account is the manager and its trying to
        // renounce its root role
        require(
            role != deriveRootRole(account),
            "role is root role of account"
        );
        AccessControl.renounceRole(role, account);
    }

    // Only a member of adminRole can initialize a role
    // Subsequent initializations don't do anything
    // Initialized role is granted to the sender
    function initializeRole(bytes32 adminRole, string calldata description)
        public
        override
        returns (bytes32 role)
    {
        role = deriveRole(adminRole, description);
        if (getRoleAdmin(role) != DEFAULT_ADMIN_ROLE) {
            if (adminRole == deriveRootRole(_msgSender())) {
                initializeManager(_msgSender());
            }
            _checkRole(adminRole, _msgSender());
            address manager = roleToManager[adminRole];
            roleToManager[role] = manager;
            _setRoleAdmin(role, adminRole);
            grantRole(role, _msgSender());
            emit InitializedRole(role, adminRole, description, _msgSender());
        } else {
            // If the role is already initialized but msg.sender does not have adminRole
            // we still wanna revert
            _checkRole(adminRole, _msgSender());
        }
    }

    // A convenience function because most users will initialize a role to grant it to one account
    function initializeAndGrantRoles(
        bytes32[] calldata adminRoles,
        string[] calldata descriptions,
        address[] calldata accounts
    ) external override returns (bytes32[] memory roles) {
        require(
            adminRoles.length == descriptions.length &&
                adminRoles.length == accounts.length,
            "Argument length mismatch"
        );
        roles = new bytes32[](adminRoles.length);
        for (uint256 ind = 0; ind < adminRoles.length; ind++) {
            roles[ind] = initializeRole(adminRoles[ind], descriptions[ind]);
            // It's also fine to grant the role to address(0) but it will emit
            // an event
            if (accounts[ind] != address(0)) {
                grantRole(roles[ind], accounts[ind]);
            }
        }
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
