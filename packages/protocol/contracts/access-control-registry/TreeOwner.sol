// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAccessControlRegistry.sol";
import "./interfaces/ITreeOwner.sol";

// This is for when you want to use AccessControlRegistry, but want the ownership
// of the tree to be transferrable. For example, an Airnode would rather use it
// where the tree owner is immutably itself, while a DAO would rather use it
// with a TreeOwner proxy that it can transfer to any other address later on.
contract TreeOwner is Ownable, ITreeOwner {
    IAccessControlRegistry public immutable accessControlRegistry;

    constructor(address accessControlRegistry_) {
        require(accessControlRegistry_ != address(0), "Zero address");
        accessControlRegistry = IAccessControlRegistry(accessControlRegistry_);
    }

    function grantRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        accessControlRegistry.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account)
        external
        override
        onlyOwner
    {
        accessControlRegistry.revokeRole(role, account);
    }

    function initializeRole(bytes32 adminRole, string calldata description)
        external
        override
        onlyOwner
        returns (bytes32 role)
    {
        role = accessControlRegistry.initializeRole(
            msg.sender,
            adminRole,
            description
        );
    }

    function initializeAndGrantRole(
        bytes32 adminRole,
        string calldata description,
        address account
    ) external override onlyOwner returns (bytes32 role) {
        role = accessControlRegistry.initializeAndGrantRole(
            msg.sender,
            adminRole,
            description,
            account
        );
    }
}
