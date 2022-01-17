// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../access-control-registry/interfaces/IAccessControlRegistryAdminned.sol";
import "./IAllocator.sol";

interface IAllocatorWithAirnode is IAccessControlRegistryAdminned, IAllocator {
    function hasSlotSetterRoleOrIsAirnode(address airnode, address account)
        external
        view
        returns (bool);

    function deriveAdminRole(address airnode)
        external
        view
        returns (bytes32 adminRole);

    function deriveSlotSetterRole(address airnode)
        external
        view
        returns (bytes32 slotSetterRole);
}
