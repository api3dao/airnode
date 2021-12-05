// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IAllocator.sol";

interface IAllocatorWithManager is IAllocator {
    function hasSlotSetterRoleOrIsManager(address account)
        external
        view
        returns (bool);

    function manager() external view returns (address);

    function adminRole() external view returns (bytes32);

    function slotSetterRole() external view returns (bytes32);
}
