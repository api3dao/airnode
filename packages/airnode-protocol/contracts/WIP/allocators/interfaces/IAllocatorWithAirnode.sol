// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAllocator.sol";

interface IAllocatorWithAirnode is IAllocator {
    function hasSlotSetterRoleOrIsAirnode(address airnode, address account)
        external
        view
        returns (bool);

    function deriveSlotSetterRole(address airnode)
        external
        view
        returns (bytes32 slotSetterRole);
}
