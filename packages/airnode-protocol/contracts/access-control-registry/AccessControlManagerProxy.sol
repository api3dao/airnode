// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AccessControlClient.sol";
import "./interfaces/IAccessControlRegistry.sol";
import "./interfaces/IAccessControlManagerProxy.sol";

/// @title Contract that acts as the proxy of a manager that will interact with
/// AccessControlRegistry
/// @notice AccessControlRegistry users that want their access control tables
/// to be transferrable (e.g., a DAO) will use this proxy instead of
/// interacting with it directly. There are cases where this transferrability
/// is not desired, e.g., if the user is an Airnode and is immutably associated
/// with a single address, in which case the manager will interact with
/// AccessControlRegistry directly.
contract AccessControlManagerProxy is
    Ownable,
    AccessControlClient,
    IAccessControlManagerProxy
{
    /// @param _accessControlRegistry Address of the AccessControlRegistry
    /// contract
    constructor(address _accessControlRegistry)
        AccessControlClient(_accessControlRegistry)
    {}

    /// @notice Initializes a role, which includes setting its admin and
    /// granting it to the sender
    /// @dev See AccessControlRegistry.sol for details
    /// @param adminRole Admin role to be assigned to the initialized role
    /// @param description Human-readable description of the initialized role
    /// @return role Initialized role
    function initializeRole(bytes32 adminRole, string calldata description)
        external
        override
        onlyOwner
        returns (bytes32 role)
    {
        role = IAccessControlRegistry(accessControlRegistry).initializeRole(
            adminRole,
            description
        );
    }

    /// @notice Initializes roles and grants them to the respective accounts
    /// @dev See AccessControlRegistry.sol for details
    /// @param adminRoles Admin roles to be assigned to the initialized roles
    /// @param descriptions Human-readable descriptions of the initialized
    /// roles
    /// @param accounts Accounts the initialized roles will be granted to
    /// @return roles Initialized roles
    function initializeAndGrantRoles(
        bytes32[] calldata adminRoles,
        string[] calldata descriptions,
        address[] calldata accounts
    ) external override onlyOwner returns (bytes32[] memory roles) {
        roles = IAccessControlRegistry(accessControlRegistry)
            .initializeAndGrantRoles(adminRoles, descriptions, accounts);
    }

    /// @notice Grants role
    /// @dev See AccessControl.sol for details
    /// @param role Role to be granted
    /// @param account Account that the role will be granted to
    function grantRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        IAccessControlRegistry(accessControlRegistry).grantRole(role, account);
    }

    /// @notice Revokes role
    /// @dev See AccessControl.sol for details
    /// @param role Role to be revoked
    /// @param account Account that the role will be revoked from
    function revokeRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        IAccessControlRegistry(accessControlRegistry).revokeRole(role, account);
    }

    /// @notice Renounces role
    /// @dev See AccessControlRegistry.sol for details
    /// @param role Role to be renounced
    /// @param account Account to renounce the role
    function renounceRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        IAccessControlRegistry(accessControlRegistry).renounceRole(
            role,
            account
        );
    }
}
