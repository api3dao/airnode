// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../AirnodeUser.sol";
import "./interfaces/IAllocator.sol";

/// @title Abstract contract that can be used to build Allocators that
/// temporarily allocate subscription slots for Airnodes
abstract contract Allocator is AirnodeUser, IAllocator {
    struct Slot {
        bytes32 subscriptionId;
        address setter;
        uint64 expirationTimestamp;
    }

    /// @notice Description of the slot setter role
    string public constant override SLOT_SETTER_ROLE_DESCRIPTION =
        "Slot setter";
    bytes32 internal constant SLOT_SETTER_ROLE_DESCRIPTION_HASH =
        keccak256(abi.encodePacked(SLOT_SETTER_ROLE_DESCRIPTION));

    /// @notice Subscription slot of an Airnode with the index
    mapping(address => mapping(uint256 => Slot))
        public
        override airnodeToSlotIndexToSlot;

    /// @param _airnodeProtocol AirnodeProtocol contract address
    constructor(address _airnodeProtocol) AirnodeUser(_airnodeProtocol) {}

    /// @notice Called internally to set a slot with the given parameters
    /// @dev The slot can be
    function _setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        uint64 expirationTimestamp
    ) internal {
        require(airnode != address(0), "Zero Airnode address");
        (, bytes32 templateId, , , ) = IAirnodeProtocol(airnodeProtocol)
            .subscriptions(subscriptionId);
        require(templateId != bytes32(0), "Subscription does not exist");
        require(
            expirationTimestamp > block.timestamp,
            "Expiration is in the past"
        );
        vacateSlot(airnode, slotIndex);
        airnodeToSlotIndexToSlot[airnode][slotIndex] = Slot({
            subscriptionId: subscriptionId,
            setter: msg.sender,
            expirationTimestamp: expirationTimestamp
        });
    }

    function vacateSlot(address airnode, uint256 slotIndex) public override {
        Slot storage slot = airnodeToSlotIndexToSlot[airnode][slotIndex];
        require(
            slot.setter == msg.sender ||
                slot.expirationTimestamp < block.timestamp ||
                setterOfSlotNoLongerHasTheRole(airnode, slotIndex),
            "Slot occuppied"
        );
        delete airnodeToSlotIndexToSlot[airnode][slotIndex];
    }

    function setterOfSlotNoLongerHasTheRole(address airnode, uint256 slotIndex)
        public
        view
        virtual
        override
        returns (bool);
}
