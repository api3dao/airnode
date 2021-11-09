// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access-control-registry/interfaces/IAccessControlRegistry.sol";
import "../access-control-registry/RoleDeriver.sol";
import "../access-control-registry/AccessControlClient.sol";

contract AllocatorWithAirnode is AccessControlClient, RoleDeriver {
    struct Slot {
        bytes32 subscriptionId;
        address setter;
        address sponsor;
        uint64 expirationTimestamp;
    }

    address public immutable manager;
    string public adminRoleDescription;
    bytes32 public immutable adminRole;
    bytes32 public immutable slotSetterRole;

    mapping(address => mapping(uint256 => Slot))
        public airnodeToSlotIndexToSlot;

    constructor(
        address _accessControlRegistry,
        string memory _adminRoleDescription,
        address _manager
    ) AccessControlClient(_accessControlRegistry) {
        require(
            bytes(_adminRoleDescription).length > 0,
            "Admin role description empty"
        );
        adminRoleDescription = _adminRoleDescription;
        manager = _manager;
        adminRole = _deriveRole(
            _deriveRootRole(_manager),
            keccak256(abi.encodePacked(_adminRoleDescription))
        );
        slotSetterRole = _deriveRole(
            adminRole,
            keccak256(abi.encodePacked("Slot setter"))
        );
    }

    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        address sponsor,
        uint64 expirationTimestamp
    ) external {
        require(hasSlotSetterRoleOrIsManager(msg.sender), "Not slot setter");
        require(airnode != address(0), "Zero Airnode address");
        require(subscriptionId != bytes32(0), "Zero subscription ID");
        require(sponsor != address(0), "Zero sponsor address");
        require(
            expirationTimestamp > block.timestamp,
            "Expiration is in the past"
        );
        require(slotIsOccuppied(airnode, slotIndex), "Slot occuppied");
        airnodeToSlotIndexToSlot[airnode][slotIndex] = Slot({
            subscriptionId: subscriptionId,
            setter: msg.sender,
            sponsor: sponsor,
            expirationTimestamp: expirationTimestamp
        });
    }

    function slotIsOccuppied(address airnode, uint256 slotIndex)
        public
        view
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
