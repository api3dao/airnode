// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAccessControlRegistry.sol";

/// @title Access control registry contract that allows users manage
/// independent tree-shaped access control tables
contract AccessControlRegistry is AccessControl, IAccessControlRegistry {
    /// @notice Returns the manager the role belongs to
    mapping(bytes32 => address) public override roleToManager;

    /// @notice Initializes the manager by initializing its root role and
    /// granting it to them
    /// @dev Anyone can initialize a manager. An uninitialized manager
    /// attempting to initialize a role will be initialized automatically.
    /// Once a manager is initialized, subsequent initialization have no
    /// effect.
    /// @param manager Manager address
    function initializeManager(address manager) public override {
        bytes32 rootRole = deriveRootRole(manager);
        if (!hasRole(rootRole, manager)) {
            _setupRole(rootRole, manager);
            roleToManager[rootRole] = manager;
            emit InitializedManager(manager, rootRole);
        }
    }

    /// @notice Overriden to disallow managers from renouncing their root roles
    /// @param role Role to be renounced
    /// @param account Account that will renounce the role
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

    /// @notice Initializes a role, which includes granting it to the sender
    /// @dev If the sender should not have the initialized role, they should
    /// explicitly renounce it afterwards.
    /// Once a role is initialized, subsequent initialization have no effect,
    /// other than granting the role to the sender.
    /// The sender must be a member of `adminRole`.
    /// If the sender is an uninitialized manager that is initializing a role
    /// directly under their root role, manager initialization will happen
    /// automatically, which will grant the sender `adminRole`.
    /// @param adminRole Admin role of the initialized role
    /// @param description Human-readable description of the initialized role
    /// @return role ID of the initialized role
    function initializeRole(bytes32 adminRole, string calldata description)
        public
        override
        returns (bytes32 role)
    {
        role = deriveRole(adminRole, description);
        if (getRoleAdmin(role) == DEFAULT_ADMIN_ROLE) {
            if (adminRole == deriveRootRole(_msgSender())) {
                initializeManager(_msgSender());
            }
            _setRoleAdmin(role, adminRole);
            roleToManager[role] = roleToManager[adminRole];
            emit InitializedRole(role, adminRole, description, _msgSender());
        }
        grantRole(role, _msgSender());
    }

    /// @notice Initializes roles and grants them to the respective accounts in
    /// addition to the sender
    /// @dev If a specific role should be initialized but not granted to an
    /// account (in addition to the sender), the respective account parameter
    /// can be left as `address(0)`.
    /// @param adminRoles Admin roles of the initialized roles
    /// @param descriptions Human-readable descriptions of the initialized
    /// roles
    /// @param accounts Accounts the initialized roles will be granted to
    /// @return roles IDs of the initalized roles
    function initializeAndGrantRoles(
        bytes32[] calldata adminRoles,
        string[] calldata descriptions,
        address[] calldata accounts
    ) external override returns (bytes32[] memory roles) {
        uint256 argumentLength = adminRoles.length;
        require(
            argumentLength == descriptions.length &&
                argumentLength == accounts.length,
            "Argument length mismatch"
        );
        require(argumentLength <= 32, "Arguments too long");
        roles = new bytes32[](argumentLength);
        for (uint256 ind = 0; ind < argumentLength; ind++) {
            roles[ind] = initializeRole(adminRoles[ind], descriptions[ind]);
            if (accounts[ind] != address(0)) {
                grantRole(roles[ind], accounts[ind]);
            }
        }
    }

    /// @notice Derices ID of the root role from the manager address
    /// @dev Zero-padding is preferred over hashing for human-readability
    /// @param manager Manager address
    /// @return rootRole ID of the root role
    function deriveRootRole(address manager)
        public
        pure
        override
        returns (bytes32 rootRole)
    {
        rootRole = bytes32(abi.encode(manager));
    }

    /// @notice Derives the ID of the role from its admin role and description
    /// @dev This implies that roles adminned by the same role cannot have the
    /// same description
    /// @param adminRole Admin role of the role
    /// @param description Description of the role
    /// @return role ID of the role
    function deriveRole(bytes32 adminRole, string calldata description)
        public
        pure
        override
        returns (bytes32 role)
    {
        role = keccak256(abi.encodePacked(adminRole, description));
    }
}
