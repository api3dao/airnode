// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

// This is an example allocator where a DAO admin address can update slots of an Airnode
// however it wants. What happens in this allocator will not affect what happens in another
// allocator that the Airnode is using (similar to authorizers).
// We probably want a more complex DaoPspAllocator where we can have admins of different ranks.
contract DaoPspAllocator {
    struct Slot {
        bytes32 subscriptionId;
        address sponsor;
    }

    mapping(address => mapping(uint256 => Slot))
        public airnodeToSlotIndexToSlot;

    function setSlot(
        address airnode,
        uint256 slotIndex,
        bytes32 subscriptionId,
        address sponsor
    ) external {
        // Check if caller is DAO admin
        // require(msg.sender == ...)
        airnodeToSlotIndexToSlot[airnode][slotIndex] = Slot({
            subscriptionId: subscriptionId,
            sponsor: sponsor
        });
    }

    // A convenience function
    function resetSlot(address airnode, uint256 slotIndex) external {
        // Check if caller is DAO admin
        // require(msg.sender == ...)
        delete airnodeToSlotIndexToSlot[airnode][slotIndex];
    }

    // At the start of each invocation, the node static-calls this where `limit` is the number of
    // slots specified for this allocator in the config file
    // We probably want to implement this with MultiCall instead
    function getActiveSubscriptions(address airnode, uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory subscriptionIds, address[] memory sponsors)
    {
        mapping(uint256 => Slot)
            storage slotIndexToSlot = airnodeToSlotIndexToSlot[airnode];
        subscriptionIds = new bytes32[](limit);
        sponsors = new address[](limit);
        for (uint256 ind = offset; ind < offset + limit; ind++) {
            bytes32 subscriptionId = slotIndexToSlot[ind].subscriptionId;
            subscriptionIds[ind - offset] = subscriptionId;
            sponsors[ind - offset] = slotIndexToSlot[ind].sponsor;
        }
    }
}
