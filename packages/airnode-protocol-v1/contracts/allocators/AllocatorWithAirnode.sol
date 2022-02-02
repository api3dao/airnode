// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminned.sol";
import "./Allocator.sol";
import "./interfaces/IAllocatorWithAirnode.sol";

/// @title Contract that Airnode operators can use to temporarily allocate
/// subscription slots for Airnodes
contract AllocatorWithAirnode is
    RoleDeriver,
    AccessControlRegistryAdminned,
    Allocator,
    IAllocatorWithAirnode
{
    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription
    )
        AccessControlRegistryAdminned(
            _accessControlRegistry,
            _adminRoleDescription
        )
    {}

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
            hasSlotSetterRoleOrIsAirnode(airnode, msg.sender),
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
            hasSlotSetterRoleOrIsAirnode(
                airnode,
                airnodeToSlotIndexToSlot[airnode][slotIndex].setter
            );
    }

    /// @notice Returns if the account has the slot setter role or has the
    /// respective Airnode address
    /// @param airnode Airnode address
    /// @param account Account address
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

    /// @notice Derives the admin role for the specific Airnode address
    /// @param airnode Airnode address
    /// @return adminRole Admin role
    function deriveAdminRole(address airnode)
        public
        view
        override
        returns (bytes32 adminRole)
    {
        adminRole = _deriveRole(
            _deriveRootRole(airnode),
            adminRoleDescriptionHash
        );
    }

    /// @notice Derives the slot setter role for the specific Airnode address
    /// @param airnode Airnode address
    /// @return slotSetterRole Slot setter role
    function deriveSlotSetterRole(address airnode)
        public
        view
        override
        returns (bytes32 slotSetterRole)
    {
        slotSetterRole = _deriveRole(
            deriveAdminRole(airnode),
            SLOT_SETTER_ROLE_DESCRIPTION_HASH
        );
    }
}
