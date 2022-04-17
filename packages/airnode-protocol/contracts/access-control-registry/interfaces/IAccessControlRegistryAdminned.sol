// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IAccessControlRegistryUser.sol";

interface IAccessControlRegistryAdminned is IAccessControlRegistryUser {
    function adminRoleDescription() external view returns (string memory);
}
