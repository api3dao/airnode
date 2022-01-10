// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/AccessControlRegistryAdminnedWithManager.sol";
import "../access-control-registry/RoleDeriver.sol";
import "../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "./Allocator.sol";
import "./interfaces/IAllocatorWithManager.sol";

contract AllocatorWithManager is
    RoleDeriver,
    AccessControlRegistryAdminnedWithManager,
    Allocator,
    IAllocatorWithManager
{
    bytes32 public immutable override slotSetterRole;

    /// @param _accessControlRegistry AccessControlRegistry contract address
    /// @param _adminRoleDescription Admin role description
    /// @param _manager Manager address
    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager,
        address _airnodeProtocol
    )
        AccessControlRegistryAdminnedWithManager(
            _accessControlRegistry,
            _adminRoleDescription,
            _manager
        )
        Allocator(_airnodeProtocol)
    {
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

    function setterOfSlotNoLongerHasTheRole(address airnode, uint256 slotIndex)
        public
        view
        override(Allocator, IAllocator)
        returns (bool)
    {
        return
            !hasSlotSetterRoleOrIsManager(
                airnodeToSlotIndexToSlot[airnode][slotIndex].setter
            );
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
