// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../access-control-registry/RoleDeriver.sol";
import "../../../access-control-registry/AccessControlClient.sol";
import "../../../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./Allocator.sol";
import "./interfaces/IAllocatorWithManager.sol";

contract AllocatorWithManager is
    RoleDeriver,
    AccessControlClient,
    Allocator,
    IAllocatorWithManager
{
    address public immutable override manager;
    bytes32 public immutable override adminRole;
    bytes32 public immutable override slotSetterRole;

    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    ) AccessControlClient(_accessControlRegistry) {
        require(
            bytes(_adminRoleDescription).length > 0,
            "Admin role description empty"
        );
        manager = _manager;
        adminRoleDescription = _adminRoleDescription;
        adminRoleDescriptionHash = keccak256(
            abi.encodePacked(_adminRoleDescription)
        );
        adminRole = _deriveRole(
            _deriveRootRole(_manager),
            adminRoleDescriptionHash
        );
        slotSetterRole = _deriveRole(
            adminRole,
            SLOT_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) external override {
        require(hasSlotSetterRoleOrIsManager(msg.sender), "Not slot setter");
        _setSlot(airnode, slotIndex, subscriptionId, expirationTimestamp);
    }

    function slotIsVacatable(address airnode, uint256 slotIndex)
        public
        view
        override(Allocator, IAllocator)
        returns (bool)
    {
        Slot storage slot = airnodeToSlotIndexToSlot[airnode][slotIndex];
        return
            slot.expirationTimestamp < block.timestamp ||
            !hasSlotSetterRoleOrIsManager(slot.setter);
    }

    function hasSlotSetterRoleOrIsManager(address account)
        public
        view
        override
        returns (bool)
    {
        return
            manager == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                slotSetterRole,
                account
            );
    }
}
