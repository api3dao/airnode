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

    string public adminRoleDescription;
    bytes32 private adminRoleDescriptionHash;
    string public constant SLOT_SETTER_ROLE_DESCRIPTION = "Slot setter";
    bytes32 private constant SLOT_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(SLOT_SETTER_ROLE_DESCRIPTION));

    mapping(address => mapping(uint256 => Slot))
        public airnodeToSlotIndexToSlot;

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
        address sponsor,
        uint64 expirationTimestamp
    ) external {
        require(
            hasSlotSetterRoleOrIsAirnode(airnode, msg.sender),
            "Not slot setter"
        );
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

    function vacateSlot(address airnode, uint256 slotIndex) external {
        require(
            airnodeToSlotIndexToSlot[airnode][slotIndex].setter == msg.sender ||
                !slotIsOccuppied(airnode, slotIndex),
            "Slot not vacatable"
        );
        delete airnodeToSlotIndexToSlot[airnode][slotIndex];
    }

    function slotIsOccuppied(address airnode, uint256 slotIndex)
        public
        view
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
        returns (bytes32 slotSetterRole)
    {
        slotSetterRole = _deriveRole(
            _deriveRole(_deriveRootRole(airnode), adminRoleDescriptionHash),
            SLOT_SETTER_ROLE_DESCRIPTION_HASH
        );
    }
}
