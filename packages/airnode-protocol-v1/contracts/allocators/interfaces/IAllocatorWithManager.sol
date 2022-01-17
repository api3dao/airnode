// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminnedWithManager.sol";
import "./IAllocator.sol";

interface IAllocatorWithManager is
    IAccessControlRegistryAdminnedWithManager,
    IAllocator
{
    function hasSlotSetterRoleOrIsManager(address account)
        external
        view
        returns (bool);

    function slotSetterRole() external view returns (bytes32);
}
