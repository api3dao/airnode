// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAccessControlRegistry.sol";
import "./interfaces/IAccessControlManager.sol";

// This is for when you want to use AccessControlRegistry, but want the ownership
// of the manager to be transferrable. For example, an Airnode would rather use it
// where the manager is immutably itself, while a DAO would rather use it
// with an AccessControlManager proxy that it can transfer to any other address later on.
contract AccessControlManager is Ownable, IAccessControlManager {
    address public immutable override accessControlRegistry;

    constructor(address _accessControlRegistry) {
        require(_accessControlRegistry != address(0), "Zero address");
        accessControlRegistry = _accessControlRegistry;
    }

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

    function initializeAndGrantRoles(
        bytes32[] calldata adminRoles,
        string[] calldata descriptions,
        address[] calldata accounts
    ) external override onlyOwner returns (bytes32[] memory roles) {
        roles = IAccessControlRegistry(accessControlRegistry)
            .initializeAndGrantRoles(adminRoles, descriptions, accounts);
    }

    function grantRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        IAccessControlRegistry(accessControlRegistry).grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        IAccessControlRegistry(accessControlRegistry).revokeRole(role, account);
    }

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
