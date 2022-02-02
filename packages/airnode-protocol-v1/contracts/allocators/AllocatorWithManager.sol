// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminnedWithManager.sol";
import "../access-control-registry/RoleDeriver.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./Allocator.sol";
import "./interfaces/IAllocatorWithManager.sol";

/// @title Contract that the manager can use to temporarily allocate
/// subscription slots for Airnodes
contract AllocatorWithManager is
    RoleDeriver,
    AccessControlRegistryAdminnedWithManager,
    Allocator,
    IAllocatorWithManager
{
    /// @notice Slot setter role
    bytes32 public immutable override slotSetterRole;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    )
        AccessControlRegistryAdminnedWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
    {
        slotSetterRole = _deriveRole(
            adminRole,
            SLOT_SETTER_ROLE_DESCRIPTION_HASH
        );
    }

    /// @notice Sets a slot with the given parameters
    /// @param airnode Airnode address
    /// @param slotIndex Index of the subscription slot to be set
    /// @param subscriptionId Subscription ID
    /// @param expirationTimestamp Timestamp at which the slot allocation will
    /// expire
    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) external override {
        require(
            hasSlotSetterRoleOrIsManager(msg.sender),
            "Sender cannot set slot"
        );
        _setSlot(airnode, slotIndex, subscriptionId, expirationTimestamp);
    }

    /// @notice Returns if the setter of the slot can still set slots
    /// @param airnode Airnode address
    /// @param slotIndex Index of the subscription slot that was set
    /// @return If the setter of the slot can still set slots
    function setterOfSlotIsCanStillSet(address airnode, uint256 slotIndex)
        public
        view
        override(Allocator, IAllocator)
        returns (bool)
    {
        return
            hasSlotSetterRoleOrIsManager(
                airnodeToSlotIndexToSlot[airnode][slotIndex].setter
            );
    }

    /// @notice Returns if the account has the slot setter role or is the
    /// manager
    /// @param account Account address
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
