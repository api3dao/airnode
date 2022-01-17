// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAccessControlRegistryAdminned.sol";

interface IAccessControlRegistryAdminnedWithManager is
    IAccessControlRegistryAdminned
{
    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);
}
