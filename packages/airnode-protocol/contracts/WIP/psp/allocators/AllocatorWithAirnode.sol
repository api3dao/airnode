// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../../access-control-registry/RoleDeriver.sol";
import "../../../access-control-registry/AccessControlClient.sol";
import "../../../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./Allocator.sol";
import "./interfaces/IAllocatorWithAirnode.sol";

contract AllocatorWithAirnode is
    RoleDeriver,
    AccessControlClient,
    Allocator,
    IAllocatorWithAirnode
{
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    ) AccessControlClient(_accessControlRegistry) {
        require(
            bytes(_adminRoleDescription).length > 0,
            "Admin role description empty"
        );
        adminRoleDescription = _adminRoleDescription;
        adminRoleDescriptionHash = keccak256(
            abi.encodePacked(_adminRoleDescription)
        );
    }

    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) external override {
        require(
            hasSlotSetterRoleOrIsAirnode(airnode, msg.sender),
            "Not slot setter"
        );
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
            !hasSlotSetterRoleOrIsAirnode(airnode, slot.setter);
    }

    function hasSlotSetterRoleOrIsAirnode(address airnode, address account)
        public
        view
        override
        returns (bool)
    {
        return
            airnode == account ||
            IAccessControlRegistry(accessControlRegistry).hasRole(
                deriveSlotSetterRole(airnode),
                account
            );
    }

    function deriveSlotSetterRole(address airnode)
        public
        view
        override
        returns (bytes32 slotSetterRole)
    {
        slotSetterRole = _deriveRole(
            _deriveRole(_deriveRootRole(airnode), adminRoleDescriptionHash),
            SLOT_SETTER_ROLE_DESCRIPTION_HASH
        );
    }
}
