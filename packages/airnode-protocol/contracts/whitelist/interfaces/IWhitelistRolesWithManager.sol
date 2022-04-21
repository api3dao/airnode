// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IWhitelistRoles.sol";
import "../../access-control-registry/interfaces/IAccessControlRegistryAdminnedWithManager.sol";

interface IWhitelistRolesWithManager is
    IWhitelistRoles,
    IAccessControlRegistryAdminnedWithManager
{
    function whitelistExpirationExtenderRole() external view returns (bytes32);

    function whitelistExpirationSetterRole() external view returns (bytes32);

    function indefiniteWhitelisterRole() external view returns (bytes32);
}
